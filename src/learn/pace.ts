// Pacing for runs, and the picture of a problem's inputs.

import type { ViewSpec, VizSpec } from "../../engine/interpreter/spec";
import type { Problem } from "../content/problems";

/** Playback speed. Always 1 for people; the end-to-end tests raise it so runs don't take minutes. */
const SPEED = (() => {
  try { return Math.max(1, Number(localStorage.getItem("pillow.speed")) || 1); } catch { return 1; }
})();

/** How long each step stays on screen while a run plays: long enough to read its explanation. */
export const STEP_MS = 1_800 / SPEED;

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
