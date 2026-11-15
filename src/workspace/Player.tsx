import { useEffect, useMemo } from "react";
import type { LineNote } from "../content/lesson";
import type { Approach, Problem } from "../content/problems";
import { preparedFor, sourceOf } from "../lib/data";
import { usePlayback } from "../lib/usePlayback";
import { type LiveInput, useLiveRun } from "../lib/useLiveRun";
import { Canvas } from "../views/Canvas";
import { CodePane } from "./CodePane";
import { Controls } from "./Controls";
import { InputBar } from "./InputBar";

interface Props {
  problem: Problem;
  approach: Approach;
  notes?: Record<number, LineNote>;
  /** The learner's own input, traced live. Null plays the precomputed example. */
  input?: LiveInput | null;
  onInput?: (input: LiveInput | null) => void;
}

/** The visualizer for one approach: stage, narration, controls, and the synced code pane. */
export function Player({ problem, approach, notes, input = null, onInput }: Props) {
  const example = useMemo(() => preparedFor(problem, approach), [problem, approach]);
  const run = useLiveRun(approach, input);
  // While a live run loads (or if it fails), the example stays on screen, dimmed.
  const live = input && run.status === "ready";
  const waiting = !!input && !live;
  const prepared = live ? run.prepared : example;
  const label = live ? input.label : problem.exampleLabel;
  const source = useMemo(() => sourceOf(approach), [approach]);
  const [state, dispatch] = usePlayback(prepared.moments, `${problem.slug}/${approach.id}/${live ? input.key : "example"}`);
  const view = prepared.view(state.index);
  const step = prepared.trace.steps[prepared.moments[state.index].stepIndex];
  const recursive = prepared.moments.some((m) => m.depth > 1);

  // Keyboard: ← → step, Space plays, R restarts, Shift+→ steps over, Shift+↑ steps out.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof Element ? e.target : document.body;
      // While a live run loads, the dimmed example on screen isn't what's about to play.
      if (waiting || e.metaKey || e.ctrlKey || e.altKey || el.closest("input, select, textarea, [contenteditable]")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); dispatch({ type: e.shiftKey && recursive ? "stepOver" : "next" }); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); dispatch({ type: "prev" }); }
      else if (e.key === "ArrowUp" && e.shiftKey && recursive) { e.preventDefault(); dispatch({ type: "stepOut" }); }
      else if (e.key === " " && !el.closest("button")) { e.preventDefault(); dispatch({ type: "toggle" }); }
      else if (e.key === "r" || e.key === "R") dispatch({ type: "restart" });
      else if (e.key === "Home") { e.preventDefault(); dispatch({ type: "restart" }); }
      else if (e.key === "End") { e.preventDefault(); dispatch({ type: "end" }); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [dispatch, recursive, waiting]);

  const status = view.final
    ? view.error ? `Stopped: ${view.error}` : `Returned ${view.returned}`
    : view.index === 0 ? `Starting with ${label}` : undefined;

  return (
    <div className="player">
      <section className={`stage ${waiting ? "is-waiting" : ""}`} aria-label="Visualization" aria-busy={run.status === "loading"}>
        {onInput ? <InputBar problem={problem} input={input} run={run} onInput={onInput} /> : <p className="example">{label}</p>}
        <Canvas views={view.views} />
        <div className="story" aria-live="polite">
          <p className={`narration ${view.final ? "final" : ""}`}>
            {view.narration ?? status ?? <span className="muted">Line {view.ranLine} ran.</span>}
          </p>
          {view.changes.length > 0 && (
            <ul className="changes" aria-label="What changed">
              {view.changes.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
          {view.final && view.narration && status && <p className="result">{status}</p>}
        </div>
        <Controls state={state} total={view.total} recursive={recursive} dispatch={dispatch} />
      </section>
      <CodePane source={source} ranLine={view.ranLine} nextLine={view.nextLine} step={step} notes={notes} />
    </div>
  );
}
