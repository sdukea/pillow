// Pacing for a run: the first and last steps at a speed you can follow, the repetitive middle
// fast-forwarded (every step still shown), so any run takes a few seconds, not a minute.

import type { ViewSpec, VizSpec } from "../../engine/interpreter/spec";
import type { Problem } from "../content/problems";

export const BEAT = 900;
const OPEN = 4, CLOSE = 2, MIDDLE = 4_000;

export function pacing(steps: number): number[] {
  if (steps <= OPEN + CLOSE + 3) return Array(steps).fill(BEAT);
  const fast = Math.max(40, Math.min(BEAT, MIDDLE / (steps - OPEN - CLOSE)));
  return Array.from({ length: steps }, (_, i) => (i < OPEN || i >= steps - CLOSE ? BEAT : fast));
}

/** Which step is on screen after `ms` of playing. */
export function stepAt(pace: number[], ms: number): number {
  let i = 0;
  while (i < pace.length - 1 && ms >= pace[i]) { ms -= pace[i]; i++; }
  return i;
}

/** A spec that draws just the inputs, from their types: the problem as a picture. */
export function inputPicture(problem: Problem): VizSpec {
  const views: ViewSpec[] = [];
  const numbers: string[] = [];
  for (const f of problem.inputs) {
    if (f.type === "int") numbers.push(f.name);
    else if (f.type === "tree") views.push({ kind: "tree", id: `in-${f.name}`, root: f.name, current: "__none__", label: f.name, showReturns: false });
    else if (f.type === "linked-list") views.push({ kind: "linked-list", id: `in-${f.name}`, pointers: [], label: f.name });
    else views.push({ kind: "array", id: `in-${f.name}`, of: f.name, label: f.name });
  }
  if (numbers.length) views.push({ kind: "vars", id: "in-vars", show: numbers, label: "" });
  return { views, lines: {} };
}

/** The run, simplified: the structures only. Scalar watch lists are left to the one line of text. */
export function simplified(spec: VizSpec): VizSpec {
  const views = spec.views.filter((v) => v.kind !== "vars");
  return { ...spec, views: views.length ? views : spec.views };
}
