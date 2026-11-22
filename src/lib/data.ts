// Loads solution sources and precomputed traces, and prepares them for viewing.

import { prepare, type Prepared } from "../../engine/interpreter/viewmodel";
import type { Trace } from "../../engine/tracer/types";
import { type Approach, growthFile, type Problem, traceFile } from "../content/problems";
import type { Measured } from "../content/validateLesson";

const SOURCES = import.meta.glob("../../engine/tracer/fixtures/*.py", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
// Traces and growth measurements are loaded per problem, when it's opened (loadProblemData), so the
// app's first load doesn't carry every problem's runs. Each file is its own chunk.
const LOADERS = import.meta.glob(["../generated/*.json", "!../generated/lab--*.json"], { import: "default" }) as Record<string, () => Promise<unknown>>;
const loaded = new Map<string, unknown>();
const generated = (file: string) => loaded.get(file);

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

/** Files a problem needs before its screens can render. */
const filesOf = (problem: Problem) => [...problem.approaches.map((a) => traceFile(problem, a)), growthFile(problem)];

export function isProblemDataLoaded(problem: Problem): boolean {
  return filesOf(problem).every((f) => loaded.has(f) || remoteTraces.has(f) || remoteGrowth.has(f) || !LOADERS[`../generated/${f}`]);
}

/** Load a problem's traces and growth. Problems explained live are already registered. */
export async function loadProblemData(problem: Problem): Promise<void> {
  await Promise.all(filesOf(problem).map(async (f) => {
    if (loaded.has(f) || remoteTraces.has(f) || remoteGrowth.has(f)) return;
    const load = LOADERS[`../generated/${f}`];
    if (load) loaded.set(f, await load());
  }));
}

/** A reference solution's source, by fixture name (interview problems, which have no approaches). */
export function fixtureSourceOf(name: string): string {
  const src = SOURCES[`../../engine/tracer/fixtures/${name}.py`];
  if (src === undefined) throw new Error(`Missing solution file for ${name}`);
  return src.trimEnd();
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
    const trace = remoteTraces.get(key) ?? (generated(key) as Trace | undefined);
    if (!trace) throw new Error(`No trace for ${key}: run npm run traces, and load the problem first (loadProblemData).`);
    p = prepare(trace, approach.spec);
    prepared.set(key, p);
  }
  return p;
}

/** Measured steps and memory at growing input sizes, for problems with a lesson. */
export function growthOf(problem: Problem): Measured | undefined {
  return remoteGrowth.get(growthFile(problem)) ?? (generated(growthFile(problem)) as Measured | undefined);
}
