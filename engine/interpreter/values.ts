// Reading and formatting traced values. Formatting follows Python's repr, because the
// learner is reading Python code: 'a' not "a", None not null, True not true.

import type { HeapObject, Step, Value } from "../tracer/types";

export type Heap = Step["heap"];

export const isRef = (v: unknown): v is { ref: number } => typeof v === "object" && v !== null && "ref" in v;

export function deref(v: Value, heap: Heap): HeapObject | undefined {
  return isRef(v) ? heap[String(v.ref)] : undefined;
}

/** The local variables of the frame that is executing at this step. */
export function activeLocals(step: Step): Record<string, Value> {
  return step.frames.at(-1)?.locals ?? {};
}

/** Two values are the same if they're equal primitives or references to the same object. */
export function sameValue(a: Value | undefined, b: Value | undefined): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function format(v: Value | undefined, heap: Heap, depth = 0): string {
  if (v === undefined) return "undefined";
  if (v === null) return "None";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return `'${v.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
  if ("bigint" in v) return v.bigint;
  if ("float" in v) return v.float === "nan" ? "nan" : v.float === "inf" ? "inf" : "-inf";
  if ("callable" in v) return v.callable;
  const obj = heap[String(v.ref)];
  if (!obj) return "…";
  if (depth > 3) return "…";
  if ("items" in obj) {
    const inner = obj.items.map((x) => format(x, heap, depth + 1)).join(", ");
    if (obj.type === "tuple") return obj.items.length === 1 ? `(${inner},)` : `(${inner})`;
    if (obj.type === "set") return obj.items.length ? `{${inner}}` : "set()";
    if (obj.type === "deque") return `deque([${inner}])`;
    return `[${inner}]`;
  }
  if ("entries" in obj) return `{${obj.entries.map(([k, x]) => `${format(k, heap, depth + 1)}: ${format(x, heap, depth + 1)}`).join(", ")}}`;
  if ("fields" in obj) {
    // Nodes read better by their value than by their full structure.
    if ("val" in obj.fields) return `${obj.type}(${format(obj.fields.val, heap, depth + 1)})`;
    return `${obj.type}(…)`;
  }
  return obj.repr;
}
