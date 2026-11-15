import { useEffect, useMemo } from "react";
import type { Problem } from "../content/problems";
import { preparedFor, sourceOf } from "../lib/data";
import { usePlayback } from "../lib/usePlayback";
import { Canvas } from "../views/Canvas";
import { CodePane } from "./CodePane";
import { Controls } from "./Controls";

interface Props {
  problem: Problem;
  approachId: string | null;
  onApproach: (id: string) => void;
  onHome: () => void;
}

export function Workspace({ problem, approachId, onApproach, onHome }: Props) {
  const approach = problem.approaches.find((a) => a.id === approachId) ?? problem.approaches.at(-1)!;
  const prepared = useMemo(() => preparedFor(problem, approach), [problem, approach]);
  const source = useMemo(() => sourceOf(approach), [approach]);
  const [state, dispatch] = usePlayback(prepared.moments, `${problem.slug}/${approach.id}`);
  const view = prepared.view(state.index);
  const step = prepared.trace.steps[prepared.moments[state.index].stepIndex];
  const recursive = prepared.moments.some((m) => m.depth > 1);

  useEffect(() => {
    document.title = `${problem.title} · LeetSee`;
  }, [problem]);

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
      else if (e.key === "Home") dispatch({ type: "restart" });
      else if (e.key === "End") dispatch({ type: "end" });
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [dispatch, recursive]);

  const status = view.final
    ? view.error ? `Stopped: ${view.error}` : `Returned ${view.returned}`
    : view.index === 0 ? `Starting with ${problem.exampleLabel}` : undefined;

  return (
    <div className="workspace">
      <header className="ws-head">
        <button type="button" className="back" onClick={onHome} aria-label="All problems">
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
        </button>
        <div className="ws-title">
          <h1>{problem.title}</h1>
          <a href={`https://leetcode.com/problems/${problem.leetcode.slug}/`} target="_blank" rel="noreferrer" className="lc-link">LeetCode {problem.leetcode.number}</a>
        </div>
        {problem.approaches.length > 1 && (
          <div className="segmented" role="tablist" aria-label="Approach">
            {problem.approaches.map((a) => (
              <button key={a.id} type="button" role="tab" aria-selected={a.id === approach.id} className={a.id === approach.id ? "on" : ""} onClick={() => onApproach(a.id)}>
                {a.name}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="ws-body">
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
        <CodePane source={source} ranLine={view.ranLine} nextLine={view.nextLine} step={step} />
      </main>
    </div>
  );
}
