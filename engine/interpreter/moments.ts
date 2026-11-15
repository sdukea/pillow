// Turns a raw trace into moments: the steps a learner moves through.
//
// The tracer reports a line *before* it runs. A moment is the transition that line causes:
// "line L just ran, here is the state now, and here is exactly what changed."
// Moment 0 is the start: the function has been called and nothing has run yet.

import type { Step, Trace, Value } from "../tracer/types";
import { type Heap, isRef, sameValue } from "./values";

export type Change =
  | { kind: "call"; fn: string; depth: number; args: Record<string, Value> }
  | { kind: "return"; fn: string; depth: number; value: Value }
  | { kind: "exception"; type: string; message: string }
  /** A name started existing in the active frame. */
  | { kind: "assign"; name: string; value: Value }
  /** A name in the active frame now holds a different value (or a different object). */
  | { kind: "rebind"; name: string; from: Value; to: Value }
  | { kind: "push"; ref: number; value: Value }
  | { kind: "pop"; ref: number; value: Value }
  | { kind: "shift"; ref: number; value: Value }
  | { kind: "unshift"; ref: number; value: Value }
  | { kind: "set-item"; ref: number; index: number; from: Value; to: Value }
  | { kind: "list-change"; ref: number }
  | { kind: "dict-set"; ref: number; key: Value; from?: Value; to: Value }
  | { kind: "dict-delete"; ref: number; key: Value; value: Value }
  | { kind: "set-add"; ref: number; value: Value }
  | { kind: "set-remove"; ref: number; value: Value }
  | { kind: "field"; ref: number; field: string; from: Value; to: Value };

export interface Moment {
  index: number;
  /** The step whose state this moment shows. */
  stepIndex: number;
  /** The line that just ran, in the frame that ran it. Absent for moment 0. */
  executed?: { line: number; depth: number; fn: string };
  /** Call depth of the frame that's active after this moment (1 = the entry function). */
  depth: number;
  changes: Change[];
  /** True when this is the last moment and the function has returned or failed. */
  final: boolean;
}

/** Which line ran to get from prev to cur, and in which frame. */
function executedLine(prev: Step): Moment["executed"] {
  const top = prev.frames.at(-1)!;
  if (prev.event === "return" && prev.frames.length > 1) {
    // After a return, the caller finishes the line that made the call (e.g. `left = depth(root.left)`).
    const caller = prev.frames.at(-2)!;
    return { line: caller.line, depth: prev.frames.length - 1, fn: caller.fn };
  }
  return { line: prev.line, depth: prev.frames.length, fn: top.fn };
}

function diffContainers(before: Heap, after: Heap): Change[] {
  const out: Change[] = [];
  for (const [id, obj] of Object.entries(after)) {
    const old = before[id];
    const ref = Number(id);
    if (!old || old.type !== obj.type) continue;
    if ("items" in obj && "items" in old) {
      const a = old.items, b = obj.items;
      if (obj.type === "set") {
        for (const x of b) if (!a.some((y) => sameValue(x, y))) out.push({ kind: "set-add", ref, value: x });
        for (const x of a) if (!b.some((y) => sameValue(x, y))) out.push({ kind: "set-remove", ref, value: x });
        continue;
      }
      if (JSON.stringify(a) === JSON.stringify(b)) continue;
      const prefix = (xs: Value[], ys: Value[]) => xs.every((x, i) => sameValue(x, ys[i]));
      if (b.length === a.length + 1 && prefix(a, b)) out.push({ kind: "push", ref, value: b.at(-1)! });
      else if (a.length === b.length + 1 && prefix(b, a)) out.push({ kind: "pop", ref, value: a.at(-1)! });
      else if (a.length === b.length + 1 && prefix(b, a.slice(1))) out.push({ kind: "shift", ref, value: a[0] });
      else if (b.length === a.length + 1 && prefix(a, b.slice(1))) out.push({ kind: "unshift", ref, value: b[0] });
      else if (a.length === b.length) {
        const diffs = a.flatMap((x, i) => (sameValue(x, b[i]) ? [] : [i]));
        if (diffs.length === 1) out.push({ kind: "set-item", ref, index: diffs[0], from: a[diffs[0]], to: b[diffs[0]] });
        else if (diffs.length) out.push({ kind: "list-change", ref });
      } else out.push({ kind: "list-change", ref });
    } else if ("entries" in obj && "entries" in old) {
      for (const [k, v] of obj.entries) {
        const prev = old.entries.find(([pk]) => sameValue(pk, k));
        if (!prev) out.push({ kind: "dict-set", ref, key: k, to: v });
        else if (!sameValue(prev[1], v)) out.push({ kind: "dict-set", ref, key: k, from: prev[1], to: v });
      }
      for (const [k, v] of old.entries) if (!obj.entries.some(([nk]) => sameValue(nk, k))) out.push({ kind: "dict-delete", ref, key: k, value: v });
    } else if ("fields" in obj && "fields" in old) {
      for (const [f, v] of Object.entries(obj.fields)) {
        if (f in old.fields && !sameValue(old.fields[f], v)) out.push({ kind: "field", ref, field: f, from: old.fields[f], to: v });
      }
    }
  }
  return out;
}

function diffLocals(prev: Step, cur: Step): Change[] {
  // Compare the active frame with the same frame in the previous step. Entering a call has no
  // "before" for the new frame (its arguments are reported by the call). After a return, the
  // caller's frame sits one level up in the previous step, and its line may have just assigned
  // the returned value, as in `left = depth(root.left)`.
  if (cur.frames.length > prev.frames.length) return [];
  const a = prev.frames[cur.frames.length - 1].locals, b = cur.frames.at(-1)!.locals;
  const out: Change[] = [];
  for (const [name, v] of Object.entries(b)) {
    if (!(name in a)) out.push({ kind: "assign", name, value: v });
    else if (!sameValue(a[name], v)) out.push({ kind: "rebind", name, from: a[name], to: v });
  }
  return out;
}

export function buildMoments(trace: Trace): Moment[] {
  const steps = trace.steps;
  if (!steps.length) return [];
  // Start where the entry function's body is about to run: its arguments are bound, nothing has run.
  const start = steps[0].event === "call" && steps.length > 1 ? 1 : 0;
  const moments: Moment[] = [{ index: 0, stepIndex: start, depth: steps[start].frames.length, changes: [], final: steps.length === 1 }];

  for (let i = start + 1; i < steps.length; i++) {
    const prev = steps[i - 1], cur = steps[i];
    // Entering a function is one moment ("called f(...)"); the hop from its def line to its
    // first line teaches nothing, so it's folded into the call.
    if (prev.event === "call") continue;
    const changes: Change[] = [];
    if (cur.event === "call") {
      changes.push({ kind: "call", fn: cur.frames.at(-1)!.fn, depth: cur.frames.length, args: cur.frames.at(-1)!.locals });
    } else if (cur.event === "return") {
      changes.push(...diffLocals(prev, cur));
      changes.push({ kind: "return", fn: cur.frames.at(-1)!.fn, depth: cur.frames.length, value: cur.returned ?? null });
    } else if (cur.event === "exception") {
      changes.push({ kind: "exception", type: cur.exception!.type, message: cur.exception!.message });
    } else {
      changes.push(...diffLocals(prev, cur));
    }
    changes.push(...diffContainers(prev.heap, cur.heap));
    moments.push({ index: moments.length, stepIndex: i, executed: executedLine(prev), depth: cur.frames.length, changes, final: false });
  }
  const last = moments.at(-1)!;
  last.final = steps.at(-1)!.event === "return" || !trace.ok;
  return moments;
}

/** Names in the active frame that point at a given object, e.g. ["prev", "head"] for a node. */
export function namesFor(ref: number, step: Step): string[] {
  const locals = step.frames.at(-1)?.locals ?? {};
  return Object.entries(locals).filter(([, v]) => isRef(v) && v.ref === ref).map(([k]) => k);
}

/**
 * The scope a line's narration, focus and conditions are evaluated in: the frame that ran the line,
 * as it is just after the line ran. Two extra names help narration tell situations apart:
 *   _entered    True when this moment entered a function call (e.g. `left = depth(root.left)` starting)
 *   _next_line  the line that runs next
 */
export function scopeAt(moment: Moment, step: Step): { locals: Record<string, Value>; heap: Heap } {
  const depth = moment.executed?.depth ?? step.frames.length;
  const frame = step.frames[Math.min(depth, step.frames.length) - 1] ?? step.frames.at(-1)!;
  return {
    locals: { ...frame.locals, _entered: moment.changes.some((c) => c.kind === "call"), _next_line: step.line },
    heap: step.heap,
  };
}
