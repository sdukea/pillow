import { useEffect, useMemo, useState } from "react";
import { prepare, type Prepared } from "../../engine/interpreter/viewmodel";
import type { Problem } from "../content/problems";
import { growthOf, preparedFor } from "../lib/data";
import { saveNote } from "../lib/notes";
import { Canvas } from "../views/Canvas";
import { inputPicture, pacing, simplified, stepAt } from "./pace";

// One idea, in five beats you move through yourself:
//   problem → the slow way (watch it) → the trick → the fast way (watch it) → your note.
// One picture or one sentence at a time. Nothing to configure, nothing to read twice.

type Beat = "problem" | "slow" | "trick" | "fast" | "note";
const BEATS: Beat[] = ["problem", "slow", "trick", "fast", "note"];
const NEXT: Record<Beat, string> = { problem: "Show Me the Slow Way", slow: "What’s the Trick?", trick: "Watch It Work", fast: "Keep the Note", note: "Done" };

interface Props { problem: Problem; onHome: () => void; onPlay: () => void; onLesson: () => void }

export function Learn({ problem, onHome, onPlay, onLesson }: Props) {
  const card = problem.lesson!.card;
  const [beat, setBeat] = useState(0);
  const at = BEATS[beat];
  const [slow, fast] = [problem.approaches[0], problem.approaches.at(-1)!];
  const runs = useMemo(() => ({
    slow: rerender(preparedFor(problem, slow), slow.spec),
    fast: rerender(preparedFor(problem, fast), fast.spec),
  }), [problem, slow, fast]);
  const picture = useMemo(() => prepare(runs.slow.trace, inputPicture(problem)).view(0).views, [runs, problem]);
  const compare = useMemo(() => comparison(problem, runs.slow.moments.length, runs.fast.moments.length), [problem, runs]);

  useEffect(() => { document.title = `${problem.title} · Pillow`; }, [problem]);
  useEffect(() => { if (at === "note") saveNote(problem); }, [at, problem]);

  const next = () => (at === "note" ? onHome() : setBeat((b) => Math.min(BEATS.length - 1, b + 1)));
  const back = () => setBeat((b) => Math.max(0, b - 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof Element ? e.target : document.body;
      if (e.metaKey || e.ctrlKey || el.closest("input, textarea")) return;
      if (e.key === "ArrowRight" || (e.key === "Enter" && !el.closest("button"))) { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
      else if (e.key === "Escape") onHome();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  return (
    <div className="learn">
      <header className="learn-top">
        <button type="button" className="glass-circle" onClick={onHome} aria-label="Back to search">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
        </button>
        <span className="learn-title">{problem.title}</span>
        <ol className="beats" aria-label={`Step ${beat + 1} of ${BEATS.length}`}>
          {BEATS.map((b, i) => <li key={b} className={i < beat ? "done" : i === beat ? "now" : ""} />)}
        </ol>
      </header>

      <main className="learn-stage" key={at}>
        {at === "problem" && (
          <>
            <div className="stage-card"><Canvas views={picture} /></div>
            <p className="line">{problem.summary}</p>
          </>
        )}
        {at === "slow" && <Run prepared={runs.slow} tone="slow" during={card.slow} after={card.waste} />}
        {at === "trick" && (
          <div className="trick">
            <p className="trick-label">The trick</p>
            <p className="trick-text">{card.trick}</p>
          </div>
        )}
        {at === "fast" && <Run prepared={runs.fast} tone="fast" during={card.trick} after={compare} />}
        {at === "note" && (
          <article className="note-card" aria-label="Your note">
            <p className="note-pattern">{problem.lesson!.compare.pattern.name}</p>
            <p className="note-trick">{card.trick}</p>
            <p className="note-spot">{card.recognize}</p>
            <p className="note-saved">Saved to Notes</p>
          </article>
        )}
      </main>

      <footer className="learn-next">
        {beat > 0 && (
          <button type="button" className="glass-circle" onClick={back} aria-label="Previous step">
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
          </button>
        )}
        <button type="button" className="btn-filled next" onClick={next} autoFocus>{NEXT[at]}</button>
        {at === "note" && (
          <span className="more">
            <button type="button" className="link" onClick={onPlay}>Play with it</button>
            <span aria-hidden="true"> · </span>
            <button type="button" className="link" onClick={onLesson}>Full lesson</button>
          </span>
        )}
      </footer>
    </div>
  );
}

/** A run that plays on its own; tap to pause, tap again to go on (or replay when it's done). */
function Run({ prepared, tone, during, after }: { prepared: Prepared; tone: "slow" | "fast"; during: string; after: string }) {
  const pace = useMemo(() => pacing(prepared.moments.length), [prepared]);
  const total = pace.reduce((a, b) => a + b, 0);
  const [ms, setMs] = useState(0);
  const [playing, setPlaying] = useState(true);
  const done = ms >= total;

  useEffect(() => {
    if (!playing || done) return;
    let last = performance.now(), raf = 0;
    const tick = (now: number) => { setMs((m) => m + (now - last)); last = now; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, done]);

  const index = done ? prepared.moments.length - 1 : stepAt(pace, ms);
  const view = prepared.view(index);
  const toggle = () => { if (done) { setMs(0); setPlaying(true); } else setPlaying((p) => !p); };

  return (
    <>
      <button type="button" className={`stage-card run ${tone} ${done ? "done" : ""}`} onClick={toggle} aria-label={done ? "Replay" : playing ? "Pause" : "Play"}>
        <span className={`count ${tone}`} aria-live="off"><strong>{index + 1}</strong> steps</span>
        <Canvas views={view.views} />
        <span className="caption-live">{view.narration ?? "\u00a0"}</span>
        {!playing && !done && <span className="paused" aria-hidden="true">❚❚</span>}
        {done && <span className="replay" aria-hidden="true">↻</span>}
      </button>
      <p className={`line ${done ? "strong" : ""}`}>{done ? after : during}</p>
    </>
  );
}

/** The same traces, drawn with the simplified spec. */
function rerender(p: Prepared, spec: Problem["approaches"][number]["spec"]): Prepared {
  return prepare(p.trace, simplified(spec));
}

/** One line that makes the difference concrete: here, and at scale. */
function comparison(problem: Problem, slowSteps: number, fastSteps: number): string {
  const growth = growthOf(problem);
  const lesson = problem.lesson!;
  const [a, b] = [problem.approaches[0], problem.approaches.at(-1)!];
  if (!growth) return `${slowSteps} steps → ${fastSteps}.`;
  if (lesson.approaches[a.id].complexity.time === lesson.approaches[b.id].complexity.time) {
    const n = growth.spaceSizes.at(-1)!;
    return `Same speed. At ${n} nodes, it holds ${growth.approaches[b.id].space.at(-1)} things in memory instead of ${growth.approaches[a.id].space.at(-1)}.`;
  }
  const n = growth.sizes.at(-1)!;
  const sa = growth.approaches[a.id].steps.at(-1)!, sb = growth.approaches[b.id].steps.at(-1)!;
  return `${slowSteps} steps → ${fastSteps} here. At ${n} items: ${sa.toLocaleString()} → ${sb.toLocaleString()}.`;
}
