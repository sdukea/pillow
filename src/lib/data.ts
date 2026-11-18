// Loads solution sources and precomputed traces, and prepares them for viewing.

import { prepare, type Prepared } from "../../engine/interpreter/viewmodel";
import type { Trace } from "../../engine/tracer/types";
import { type Approach, growthFile, type Problem, traceFile } from "../content/problems";
import type { Measured } from "../content/validateLesson";

const SOURCES = import.meta.glob("../../engine/tracer/fixtures/*.py", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const GENERATED = import.meta.glob("../generated/*.json", { import: "default", eager: true }) as Record<string, unknown>;
const TRACES = GENERATED as Record<string, Trace>;

// Problems explained live (not built into the app): their sources, traces and growth, registered at
// runtime from the API. Everything else reads them exactly like built-in problems.
const remoteSources = new Map<string, string>();
const remoteTraces = new Map<string, Trace>();
const remoteGrowth = new Map<string, Measured>();

export function registerRemote(problem: Problem, sources: Record<string, string>, traces: Record<string, Trace>, growth: Measured) {
  for (const a of problem.approaches) {
    remoteSources.set(a.solution, sources[a.id]);
    remoteTraces.set(traceFile(problem, a), traces[a.id]);
  }
  remoteGrowth.set(growthFile(problem), growth);
}

export function sourceOf(approach: Approach): string {
  const remote = remoteSources.get(approach.solution);
  if (remote !== undefined) return remote.trimEnd();
  const src = SOURCES[`../../engine/tracer/fixtures/${approach.solution}.py`];
  if (src === undefined) throw new Error(`Missing solution file for ${approach.solution}`);
  return src.trimEnd();
}

const prepared = new Map<string, Prepared>();

/** The prepared trace for an approach on its problem's example. Cached, since preparing is pure. */
export function preparedFor(problem: Problem, approach: Approach): Prepared {
  const key = traceFile(problem, approach);
  let p = prepared.get(key);
  if (!p) {
    const trace = remoteTraces.get(key) ?? TRACES[`../generated/${key}`];
    if (!trace) throw new Error(`No trace for ${key}. Run npm run traces.`);
    p = prepare(trace, approach.spec);
    prepared.set(key, p);
  }
  return p;
}

/** Measured steps and memory at growing input sizes, for problems with a lesson. */
export function growthOf(problem: Problem): Measured | undefined {
  return remoteGrowth.get(growthFile(problem)) ?? (GENERATED[`../generated/${growthFile(problem)}`] as Measured | undefined);
}
