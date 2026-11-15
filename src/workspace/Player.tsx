import { useEffect, useMemo } from "react";
import type { LineNote } from "../content/lesson";
import type { Approach, Problem } from "../content/problems";
import { preparedFor, sourceOf } from "../lib/data";
import { usePlayback } from "../lib/usePlayback";
import { Canvas } from "../views/Canvas";
import { CodePane } from "./CodePane";
import { Controls } from "./Controls";

/** The visualizer for one approach: stage, narration, controls, and the synced code pane. */
export function Player({ problem, approach, notes }: { problem: Problem; approach: Approach; notes?: Record<number, LineNote> }) {
  const prepared = useMemo(() => preparedFor(problem, approach), [problem, approach]);
  const source = useMemo(() => sourceOf(approach), [approach]);
  const [state, dispatch] = usePlayback(prepared.moments, `${problem.slug}/${approach.id}`);
  const view = prepared.view(state.index);
  const step = prepared.trace.steps[prepared.moments[state.index].stepIndex];
  const recursive = prepared.moments.some((m) => m.depth > 1);

  // Keyboard: ← → step, Space plays, R restarts, Shift+→ steps over, Shift+↑ steps out.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest("input, select, textarea")) return;
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
  }, [dispatch, recursive]);

  const status = view.final
    ? view.error ? `Stopped: ${view.error}` : `Returned ${view.returned}`
    : view.index === 0 ? `Starting with ${problem.exampleLabel}` : undefined;

  return (
    <div className="player">
      <section className="stage" aria-label="Visualization">
        <p className="example">{problem.exampleLabel}</p>
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
