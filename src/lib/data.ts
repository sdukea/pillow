// Loads solution sources and precomputed traces, and prepares them for viewing.

import { prepare, type Prepared } from "../../engine/interpreter/viewmodel";
import type { Trace } from "../../engine/tracer/types";
import { type Approach, growthFile, type Problem, traceFile } from "../content/problems";
import type { Measured } from "../content/validateLesson";

const SOURCES = import.meta.glob("../../engine/tracer/fixtures/*.py", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const GENERATED = import.meta.glob("../generated/*.json", { import: "default", eager: true }) as Record<string, unknown>;
const TRACES = GENERATED as Record<string, Trace>;

export function sourceOf(approach: Approach): string {
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
    const trace = TRACES[`../generated/${key}`];
    if (!trace) throw new Error(`No trace for ${key}. Run npm run traces.`);
    p = prepare(trace, approach.spec);
    prepared.set(key, p);
  }
  return p;
}

/** Measured steps and memory at growing input sizes, for problems with a lesson. */
export function growthOf(problem: Problem): Measured | undefined {
  return GENERATED[`../generated/${growthFile(problem)}`] as Measured | undefined;
}
