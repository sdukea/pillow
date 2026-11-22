import { useEffect, useMemo, useRef, useState } from "react";
import { prepare, type Prepared, type ViewModel } from "../../engine/interpreter/viewmodel";
import type { Problem } from "../content/problems";
import { growthOf, preparedFor } from "../lib/data";
import { FollowUps, PractiseNext, WhyRight } from "./AfterLesson";
import { saveNote } from "../lib/notes";
import { record } from "../knowledge/evidence";
import { Solve } from "../solve/Solve";
import { misconceptionById } from "../knowledge/misconceptions";
import type { ReasoningStep } from "../content/lesson";
import { type Choice, complexityFor, type ComplexityQuestion, type Prediction, predictionFor } from "../knowledge/questions";
import { Canvas } from "../views/Canvas";
import { inputPicture, STEP_MS } from "./pace";
import { type ConceptId, conceptById } from "../knowledge/concepts";
import { useEvidence } from "../knowledge/evidence";
import { assess } from "../knowledge/model";
import { Rich } from "../lesson/Rich";

// A problem, start to finish: what it teaches, the slow way, your turn to find the trick, the trick,
// the fast way, writing it yourself, and the note. Every step explains itself in one large sentence
// at a time; every run can be stepped through at your own pace. Your answers are evidence for your
// knowledge map: watching alone never counts as understanding.

type Beat = "overview" | "slow" | "think" | "trick" | "fast" | "solve" | "note";
const BEATS: Beat[] = ["overview", "slow", "think", "trick", "fast", "solve", "note"];
const NEXT: Record<Beat, string> = { overview: "Start With the Slow Way", slow: "Your Turn", think: "Put It Together", trick: "Watch It Work", fast: "Write It Yourself", solve: "Keep the Note", note: "Done" };

interface Props { problem: Problem; onHome: () => void; onPlay: () => void; onLesson: () => void; onConcept: (id: string) => void; onOpen?: (slug: string) => void }

export function Learn({ problem, onHome, onPlay, onLesson, onConcept, onOpen }: Props) {
  const card = problem.lesson!.card;
  const [beat, setBeat] = useState(0);
  const at = BEATS[beat];
  const [slow, fast] = [problem.approaches[0], problem.approaches.at(-1)!];
  const runs = useMemo(() => ({ slow: preparedFor(problem, slow), fast: preparedFor(problem, fast) }), [problem, slow, fast]);
  const picture = useMemo(() => prepare(runs.slow.trace, inputPicture(problem)).view(0).views, [runs, problem]);
  const compare = useMemo(() => comparison(problem, runs.slow.moments.length, runs.fast.moments.length), [problem, runs]);
  const asks = useMemo(() => ({
    slow: { prediction: predictionFor(runs.slow, 1), growth: complexityFor(problem, slow.id) },
    fast: { prediction: predictionFor(runs.fast, 2), growth: complexityFor(problem, fast.id) },
  }), [runs, problem, slow, fast]);
  // A run's beat is finished once it has played and its questions are answered.
  const [finished, setFinished] = useState<Record<string, boolean>>({});
  const locked = (at === "slow" || at === "fast" || at === "think") && !finished[at];
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
        {at === "overview" && <Overview problem={problem} picture={picture} onConcept={onConcept} />}
        {at === "slow" && <Run prepared={runs.slow} tone="slow" title={problem.lesson!.approaches[slow.id].headline} legend={problem.lesson!.approaches[slow.id].legend} after={card.waste} {...asks.slow} onEvidence={evidence(slow)} onFinished={() => setFinished((f) => ({ ...f, slow: true }))} />}
        {at === "think" && (
          <Think
            seed={problem.slug}
            steps={problem.lesson!.reasoning}
            onAnswer={(step, choice, hinted) => {
              const c = step.choices[choice];
              const extra = c.misconception ? misconceptionById.get(c.misconception)?.concept : undefined;
              record({
                task: "reason", problem: problem.slug, concepts: [...new Set([...step.concepts, ...(extra ? [extra] : [])])],
                correct: !!c.correct, hinted, misconception: c.misconception, detail: step.ask.replace(/[.?]$/, ""),
              });
            }}
            onFinished={() => setFinished((f) => ({ ...f, think: true }))}
          />
        )}
        {at === "trick" && (
          <div className="trick">
            <p className="trick-label">The trick</p>
            <p className="trick-text">{card.trick}</p>
          </div>
        )}
        {at === "fast" && <Run prepared={runs.fast} tone="fast" title={problem.lesson!.approaches[fast.id].headline} legend={problem.lesson!.approaches[fast.id].legend} after={compare} {...asks.fast} onEvidence={evidence(fast)} onFinished={() => setFinished((f) => ({ ...f, fast: true }))} />}
        {at === "fast" && finished.fast && problem.lesson!.approaches[fast.id].correctness && <WhyRight correctness={problem.lesson!.approaches[fast.id].correctness!} />}
        {at === "solve" && <Solve problem={problem} onSolved={() => setFinished((f) => ({ ...f, solve: true }))} />}
        {at === "note" && (
          <article className="note-card" aria-label="Your note">
            <p className="note-pattern">{problem.lesson!.compare.pattern.name}</p>
            <p className="note-trick">{card.trick}</p>
            <p className="note-spot">{card.recognize}</p>
            <p className="note-saved">Saved to Notes</p>
          </article>
        )}
        {at === "note" && problem.lesson!.followUps?.length ? <FollowUps items={problem.lesson!.followUps} /> : null}
        {at === "note" && onOpen && <PractiseNext slug={problem.slug} onOpen={onOpen} />}
      </main>

      <footer className="learn-next">
        {beat > 0 && (
          <button type="button" className="glass-circle" onClick={back} aria-label="Previous step">
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
          </button>
        )}
        <button type="button" className={`${at === "solve" ? "btn-gray" : "btn-filled"} next`} onClick={next} disabled={locked} autoFocus={at !== "solve"}>
          {locked ? "Answer to Continue" : at === "solve" && !finished.solve ? "Skip for Now" : NEXT[at]}
        </button>
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
  title: string;
  legend: { name: string; means: string }[];
  /** What the run shows, said once it's finished. */
  after: string;
  prediction: Prediction | null;
  growth: ComplexityQuestion | null;
  onEvidence: (task: "predict" | "complexity" | "exposure", correct: boolean | undefined, detail: string) => void;
  onFinished: () => void;
}

/**
 * A run you can follow: it says what every marker means, plays one step at a time at a pace you
 * can read (or step through yourself), explains each step in one large sentence, and stops once for
 * you to predict the next move. When it ends, it asks how the work grows.
 */
function Run({ prepared, tone, title, legend, after, prediction, growth, onEvidence, onFinished }: RunProps) {
  const last = prepared.moments.length - 1;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [predicted, setPredicted] = useState<number | null>(null);
  const [grew, setGrew] = useState<number | null>(null);
  const asking = !!prediction && predicted === null && index >= prediction.moment;
  const done = index >= last;
  const exposed = useRef(false);
  const reported = useRef(false);

  useEffect(() => {
    if (!playing || done || asking) return;
    const t = setTimeout(() => setIndex((i) => Math.min(last, prediction && predicted === null ? Math.min(prediction.moment, i + 1) : i + 1)), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, done, asking, index, last, prediction, predicted]);

  useEffect(() => {
    if (done && !exposed.current) { exposed.current = true; onEvidence("exposure", undefined, "watched it run"); }
    if (done && !reported.current && (!prediction || predicted !== null) && (!growth || grew !== null)) { reported.current = true; onFinished(); }
  }, [done, predicted, grew, prediction, growth, onEvidence, onFinished]);

  const view = prepared.view(index);
  const go = (to: number) => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(prediction && predicted === null ? prediction.moment : last, to)));
  };
  const explanation = done ? `${view.narration ? view.narration + " " : ""}${after}` : view.narration ?? (index === 0 ? "Here’s the input, before anything runs." : " ");

  return (
    <section className={`run-beat ${tone}`}>
      <header className="run-head">
        <p className="run-kind">{tone === "slow" ? "The slow way" : "The fast way"}</p>
        <h2 className="run-title">{title}</h2>
      </header>
      <dl className="legend">
        {legend.map((l) => <div key={l.name}><dt><code>{l.name}</code></dt><dd>{l.means}</dd></div>)}
      </dl>
      <div className={`stage-card run ${tone} ${done ? "done" : ""} ${asking ? "asking" : ""}`}>
        <div className="canvas-big"><Canvas views={view.views} /></div>
      </div>
      {prediction && asking ? (
        <Ask prompt={prediction.prompt} choices={prediction.choices} picked={predicted} onPick={(i) => {
          setPredicted(i);
          onEvidence("predict", prediction.choices[i].correct, prediction.detail);
          setPlaying(true);
        }} />
      ) : (
        <>
          <p className={`explain ${done ? "strong" : ""}`} aria-live="polite">{explanation}</p>
          {predicted !== null && prediction && !done && (
            <p className={`ask-verdict ${prediction.choices[predicted].correct ? "right" : "wrong"}`}>
              {prediction.choices[predicted].correct ? "Your prediction was right." : `Your prediction: ${prediction.choices[predicted].label}. Watch where it actually goes.`}
            </p>
          )}
          <div className="stepper" role="toolbar" aria-label="Step through the run">
            <button type="button" className="step-btn" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Step back">‹</button>
            <button type="button" className="step-btn play" onClick={() => (done ? (setIndex(0), setPlaying(true)) : setPlaying((p) => !p))} aria-label={done ? "Replay" : playing ? "Pause" : "Play"}>
              {done ? "↻" : playing ? "❚❚" : "▶"}
            </button>
            <button type="button" className="step-btn" onClick={() => go(index + 1)} disabled={done || asking} aria-label="Step forward">›</button>
            <span className="step-count">Step {index + 1} of {last + 1}</span>
          </div>
        </>
      )}
      {done && growth && <Ask prompt={growth.prompt} choices={growth.choices} picked={grew} onPick={(i) => { setGrew(i); onEvidence("complexity", growth.choices[i].correct, growth.detail); }} />}
    </section>
  );
}

/** What this problem is, and what it will teach you: the concepts, with where you stand on each. */
function Overview({ problem, picture, onConcept }: { problem: Problem; picture: ViewModel[]; onConcept: (id: string) => void }) {
  const log = useEvidence();
  const states = useMemo(() => assess(log), [log]);
  const teaches = useMemo(() => [...new Set(problem.approaches.flatMap((a) => problem.lesson!.approaches[a.id].concepts))], [problem]);
  const buildsOn = useMemo(() => [...new Set(teaches.flatMap((c) => conceptById.get(c)!.requires))].filter((c) => !teaches.includes(c as ConceptId)), [teaches]);
  return (
    <section className="overview">
      <h1 className="overview-title">{problem.title}</h1>
      <p className="overview-statement"><Rich text={problem.lesson!.understand.statement} /></p>
      <div className="stage-card"><div className="canvas-big"><Canvas views={picture} /></div></div>
      <p className="overview-output"><Rich text={problem.lesson!.understand.output} /></p>
      <h2 className="overview-h">What this problem teaches</h2>
      <ul className="teaches">
        {teaches.map((id) => {
          const c = conceptById.get(id)!;
          const s = states.get(id)!;
          return (
            <li key={id}>
              <button type="button" className="teach-row" onClick={() => onConcept(id)}>
                <span className={`teach-state ${s.state}`}>{STATE_WORD[s.state]}</span>
                <span className="teach-name">{c.name}</span>
                <span className="teach-means">{c.means}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {buildsOn.length > 0 && (
        <p className="builds-on">Builds on {buildsOn.map((id, i) => (
          <span key={id}>{i > 0 && ", "}<button type="button" className="link" onClick={() => onConcept(id)}>{conceptById.get(id)!.name}</button></span>
        ))}.</p>
      )}
    </section>
  );
}

const STATE_WORD: Record<string, string> = { unseen: "New", seen: "Seen", learning: "Learning", shaky: "Needs work", understood: "Understood" };

/**
 * Your turn: work the trick out, one question at a time. Hints are there (each one weakens the
 * evidence a right answer gives). The first answer to each question is what counts; after a wrong
 * one, its reply explains what's off and you try again until you reach it.
 */
function Think({ seed, steps, onAnswer, onFinished }: { seed: string; steps: ReasoningStep[]; onAnswer: (step: ReasoningStep, choice: number, hinted: boolean) => void; onFinished: () => void }) {
  const [at, setAt] = useState(0);
  // Lessons are written with the right answer first; show the choices in an order fixed per
  // problem and step, so the position never gives the answer away.
  const order = useMemo(() => steps.map((st, k) => shuffledIndices(st.choices.length, `${seed}:${k}`)), [steps, seed]);
  const [hints, setHints] = useState(0);
  const [tried, setTried] = useState<number[]>([]);
  const step = steps[at];
  const solved = tried.some((i) => step.choices[i].correct);
  const last = tried.at(-1);
  const reported = useRef(false);

  const pick = (i: number) => {
    if (solved || tried.includes(i)) return;
    if (tried.length === 0) onAnswer(step, i, hints > 0);
    setTried((t) => [...t, i]);
    if (step.choices[i].correct && at === steps.length - 1 && !reported.current) { reported.current = true; onFinished(); }
  };
  const advance = () => { setAt((a) => a + 1); setHints(0); setTried([]); };

  return (
    <section className="think" aria-label="Your turn">
      <p className="trick-label">Your turn · {at + 1} of {steps.length}</p>
      <p className="ask-prompt think-ask">{step.ask}</p>
      <div className="think-choices" role="group">
        {order[at].map((i) => {
          const c = step.choices[i];
          const picked = tried.includes(i);
          return (
            <button key={c.text} type="button" disabled={solved || picked}
              className={`choice ${picked ? (c.correct ? "right" : "wrong") : solved ? "dim" : ""}`}
              onClick={() => pick(i)}>
              {c.text}
            </button>
          );
        })}
      </div>
      {last !== undefined && (
        <p className={`think-reply ${step.choices[last].correct ? "right" : "wrong"}`} role="status">
          {step.choices[last].reply}{!step.choices[last].correct && <span className="think-again"> Try another.</span>}
        </p>
      )}
      {!solved && hints < step.hints.length && (
        <button type="button" className="link think-hint" onClick={() => setHints((h) => h + 1)}>
          {hints === 0 ? "Hint" : "Another hint"} <span className="muted">({hints + 1} of {step.hints.length})</span>
        </button>
      )}
      {!solved && hints > 0 && (
        <ul className="hints">{step.hints.slice(0, hints).map((h) => <li key={h}>{h}</li>)}</ul>
      )}
      {solved && at < steps.length - 1 && <button type="button" className="btn-gray think-next" onClick={advance}>Next Question</button>}
    </section>
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

/** A fixed shuffle of 0..n-1 from a string seed. */
export function shuffledIndices(n: number, seed: string): number[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const out = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
