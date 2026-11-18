import { useEffect, useMemo, useRef, useState } from "react";
import { prepare, type Prepared } from "../../engine/interpreter/viewmodel";
import type { Problem } from "../content/problems";
import { growthOf, preparedFor } from "../lib/data";
import { saveNote } from "../lib/notes";
import { record } from "../knowledge/evidence";
import { type Choice, complexityFor, type ComplexityQuestion, type Prediction, predictionFor } from "../knowledge/questions";
import { Canvas } from "../views/Canvas";
import { inputPicture, pacing, simplified, stepAt } from "./pace";

// One idea, in five beats you move through yourself:
//   problem → the slow way → the trick → the fast way → your note.
// One picture or one sentence at a time. Each run stops once to ask you to predict what happens
// next, and ends by asking how the work grows. Your answers are evidence for your knowledge map:
// watching alone never counts as understanding.

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
  const asks = useMemo(() => ({
    slow: { prediction: predictionFor(runs.slow, 1), growth: complexityFor(problem, slow.id) },
    fast: { prediction: predictionFor(runs.fast, 2), growth: complexityFor(problem, fast.id) },
  }), [runs, problem, slow, fast]);
  // A run's beat is finished once it has played and its questions are answered.
  const [finished, setFinished] = useState<Record<string, boolean>>({});
  const locked = (at === "slow" || at === "fast") && !finished[at];
  const evidence = (approach: typeof slow) => (task: "predict" | "complexity" | "exposure", correct: boolean | undefined, detail: string) => {
    const concepts = problem.lesson!.approaches[approach.id].concepts;
    record({ task, problem: problem.slug, approach: approach.id, concepts: task === "complexity" ? [...new Set(["complexity" as const, ...concepts])] : concepts, correct, detail });
  };

  useEffect(() => { document.title = `${problem.title} · Pillow`; }, [problem]);
  useEffect(() => { if (at === "note") saveNote(problem); }, [at, problem]);

  const next = () => { if (locked) return; if (at === "note") onHome(); else setBeat((b) => Math.min(BEATS.length - 1, b + 1)); };
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
        {at === "slow" && <Run prepared={runs.slow} tone="slow" during={card.slow} after={card.waste} {...asks.slow} onEvidence={evidence(slow)} onFinished={() => setFinished((f) => ({ ...f, slow: true }))} />}
        {at === "trick" && (
          <div className="trick">
            <p className="trick-label">The trick</p>
            <p className="trick-text">{card.trick}</p>
          </div>
        )}
        {at === "fast" && <Run prepared={runs.fast} tone="fast" during={card.trick} after={compare} {...asks.fast} onEvidence={evidence(fast)} onFinished={() => setFinished((f) => ({ ...f, fast: true }))} />}
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
        <button type="button" className="btn-filled next" onClick={next} disabled={locked} autoFocus>{locked ? "Answer to Continue" : NEXT[at]}</button>
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

interface RunProps {
  prepared: Prepared;
  tone: "slow" | "fast";
  during: string;
  after: string;
  prediction: Prediction | null;
  growth: ComplexityQuestion | null;
  onEvidence: (task: "predict" | "complexity" | "exposure", correct: boolean | undefined, detail: string) => void;
  onFinished: () => void;
}

/**
 * A run that plays on its own and stops once for you to predict the next move; tap the picture to
 * pause or replay. When it ends, it asks how the work grows.
 */
function Run({ prepared, tone, during, after, prediction, growth, onEvidence, onFinished }: RunProps) {
  const pace = useMemo(() => pacing(prepared.moments.length), [prepared]);
  const total = pace.reduce((a, b) => a + b, 0);
  const stopAt = prediction ? pace.slice(0, prediction.moment).reduce((a, b) => a + b, 0) : Infinity;
  const [ms, setMs] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [predicted, setPredicted] = useState<number | null>(null);
  const [grew, setGrew] = useState<number | null>(null);
  const asking = !!prediction && predicted === null && ms >= stopAt;
  const done = ms >= total;
  const exposed = useRef(false);
  const reported = useRef(false);

  useEffect(() => {
    if (!playing || done || asking) return;
    let last = performance.now(), raf = 0;
    const tick = (now: number) => {
      setMs((m) => Math.min(predicted === null && prediction ? stopAt : Infinity, m + (now - last)));
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, done, asking, predicted, prediction, stopAt]);

  useEffect(() => {
    if (done && !exposed.current) { exposed.current = true; onEvidence("exposure", undefined, "watched it run"); }
    if (done && !reported.current && (!prediction || predicted !== null) && (!growth || grew !== null)) { reported.current = true; onFinished(); }
  }, [done, predicted, grew, prediction, growth, onEvidence, onFinished]);

  const index = done ? prepared.moments.length - 1 : stepAt(pace, ms);
  const view = prepared.view(index);
  const toggle = () => { if (asking) return; if (done) { setMs(predicted === null ? 0 : stopAt); setPlaying(true); } else setPlaying((p) => !p); };

  return (
    <>
      <div className={`stage-card run ${tone} ${done ? "done" : ""} ${asking ? "asking" : ""}`} onClick={toggle} role="button" tabIndex={0} aria-label={asking ? "Waiting for your prediction" : done ? "Replay" : playing ? "Pause" : "Play"}
        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } }}>
        <span className={`count ${tone}`} aria-live="off"><strong>{index + 1}</strong> steps</span>
        <Canvas views={view.views} />
        <span className="caption-live">{asking ? "\u00a0" : view.narration ?? "\u00a0"}</span>
        {!playing && !done && !asking && <span className="paused" aria-hidden="true">❚❚</span>}
        {done && <span className="replay" aria-hidden="true">↻</span>}
      </div>
      {prediction && (asking || (predicted !== null && !done)) ? (
        <Ask prompt={prediction.prompt} choices={prediction.choices} picked={predicted} onPick={(i) => {
          setPredicted(i);
          onEvidence("predict", prediction.choices[i].correct, prediction.detail);
          setPlaying(true);
        }} />
      ) : done && growth ? (
        <>
          <p className="line strong">{after}</p>
          <Ask prompt={growth.prompt} choices={growth.choices} picked={grew} onPick={(i) => { setGrew(i); onEvidence("complexity", growth.choices[i].correct, growth.detail); }} />
        </>
      ) : (
        <p className={`line ${done ? "strong" : ""}`}>{done ? after : during}</p>
      )}
    </>
  );
}

/** A question with a few choices: pick one, see whether it was right, and the right one. */
function Ask({ prompt, choices, picked, onPick }: { prompt: string; choices: Choice[]; picked: number | null; onPick: (i: number) => void }) {
  const answered = picked !== null;
  return (
    <section className="ask-card" aria-label="Question">
      <p className="ask-prompt"><Code text={prompt} /></p>
      <div className="ask-choices" role="group">
        {choices.map((c, i) => (
          <button key={c.label} type="button" disabled={answered}
            className={`choice ${!answered ? "" : c.correct ? "right" : i === picked ? "wrong" : "dim"}`}
            onClick={() => onPick(i)}>
            {c.label}
          </button>
        ))}
      </div>
      {answered && <p className={`ask-verdict ${choices[picked].correct ? "right" : "wrong"}`} role="status">{choices[picked].correct ? "Right." : "Not this time. Watch what it does."}</p>}
    </section>
  );
}

/** `code` in a prompt, rendered as code. */
function Code({ text }: { text: string }) {
  return <>{text.split(/(`[^`]+`)/).map((part, i) => part.startsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : part)}</>;
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
