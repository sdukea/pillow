import { useEffect, useState } from "react";
import { prepare, type Prepared } from "../../engine/interpreter/viewmodel";
import type { Arg } from "../../engine/tracer/types";
import type { Problem } from "../content/problems";
import { preparedFor, sourceOf } from "../lib/data";
import { LIVE_MAX_STEPS, traceLive } from "../lib/live";

export type Lanes =
  | { status: "ready"; lanes: Prepared[] }
  | { status: "running"; lanes: Prepared[] } // previous lanes stay on screen while new traces run
  | { status: "error"; lanes: Prepared[]; message: string };

const cache = new Map<string, Prepared>();

/**
 * Every approach traced on the input on screen. The example uses the build's traces (instant);
 * any other input is traced live by real Python in a worker, and cached.
 */
export function useTraces(problem: Problem, args: Arg[] | null): Lanes {
  const example = () => problem.approaches.map((a) => preparedFor(problem, a));
  const [state, setState] = useState<Lanes>(() => ({ status: "ready", lanes: example() }));

  useEffect(() => {
    if (!args) { setState({ status: "ready", lanes: example() }); return; }
    const key = JSON.stringify(args);
    const hits = problem.approaches.map((a) => cache.get(`${a.solution}|${key}`));
    if (hits.every(Boolean)) { setState({ status: "ready", lanes: hits as Prepared[] }); return; }
    let live = true;
    setState((s) => ({ status: "running", lanes: s.lanes }));
    Promise.all(problem.approaches.map(async (a) => {
      const trace = await traceLive({ source: sourceOf(a), entry: a.entry, args });
      if (trace.truncated) throw new Error(`Too many steps (over ${LIVE_MAX_STEPS.toLocaleString()}). Try a smaller input.`);
      if (!trace.ok && trace.error) throw new Error(`${trace.error.type}: ${trace.error.message}`);
      const p = prepare(trace, a.spec);
      cache.set(`${a.solution}|${key}`, p);
      return p;
    }))
      .then((lanes) => { if (live) setState({ status: "ready", lanes }); })
      .catch((e: Error) => { if (live) setState((s) => ({ status: "error", lanes: s.lanes, message: e.message })); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem, args === null ? "" : JSON.stringify(args)]);

  return state;
}
