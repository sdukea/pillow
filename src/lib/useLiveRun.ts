import { useEffect, useState } from "react";
import { prepare, type Prepared } from "../../engine/interpreter/viewmodel";
import type { Arg } from "../../engine/tracer/types";
import type { Approach } from "../content/problems";
import { sourceOf } from "./data";
import { LIVE_MAX_STEPS, pythonReady, traceLive } from "./live";

/** An input the learner typed (or picked), parsed and ready to trace. */
export interface LiveInput { args: Arg[]; label: string; key: string }

export type LiveRun =
  | { status: "idle" }
  | { status: "loading"; firstLoad: boolean }
  | { status: "ready"; prepared: Prepared }
  | { status: "error"; message: string };

const cache = new Map<string, Prepared>();

/** Trace an approach on a live input in the Python worker. Results are cached per input. */
export function useLiveRun(approach: Approach, input: LiveInput | null): LiveRun {
  const key = input ? `${approach.solution}|${input.key}` : "";
  const [run, setRun] = useState<LiveRun>({ status: "idle" });

  useEffect(() => {
    if (!input) { setRun({ status: "idle" }); return; }
    const hit = cache.get(key);
    if (hit) { setRun({ status: "ready", prepared: hit }); return; }
    let live = true;
    setRun({ status: "loading", firstLoad: !pythonReady() });
    traceLive({ source: sourceOf(approach), entry: approach.entry, args: input.args })
      .then((trace) => {
        if (trace.truncated) throw new Error(`This input needs more than ${LIVE_MAX_STEPS.toLocaleString()} steps. Try a smaller one.`);
        if (!trace.ok && trace.error) throw new Error(`The solution raised ${trace.error.type}: ${trace.error.message}`);
        const prepared = prepare(trace, approach.spec);
        cache.set(key, prepared);
        if (live) setRun({ status: "ready", prepared });
      })
      .catch((err: unknown) => { if (live) setRun({ status: "error", message: err instanceof Error ? err.message : String(err) }); });
    return () => { live = false; };
    // `key` captures both the approach and the input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return run;
}
