// A trace's return value as plain JSON, so it can be compared with a brief's expected output.
// Lists and tuples become arrays, sets become sorted arrays, dicts become objects, a linked list
// becomes its values in order, and a binary tree becomes LeetCode's level-order list.

import type { HeapObject, Trace, Value } from "../engine/tracer/types";

export function plainResult(trace: Trace): unknown {
  return plain(trace.result ?? null, trace.resultHeap ?? {});
}

function plain(v: Value, heap: Record<string, HeapObject>, depth = 0): unknown {
  if (v === null || typeof v !== "object") return v;
  if ("bigint" in v) return v.bigint;
  if ("float" in v) return v.float;
  if ("callable" in v) return `<${v.callable}>`;
  const obj = heap[String(v.ref)];
  if (!obj || depth > 50) return null;
  if ("items" in obj) {
    const items = obj.items.map((x) => plain(x, heap, depth + 1));
    return obj.type === "set" ? items.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : items;
  }
  if ("entries" in obj) return Object.fromEntries(obj.entries.map(([k, x]) => [String(plain(k, heap, depth + 1)), plain(x, heap, depth + 1)]));
  if ("fields" in obj) {
    if ("next" in obj.fields) return linkedList(v, heap);
    if ("left" in obj.fields || "right" in obj.fields) return levelOrder(v, heap);
    return Object.fromEntries(Object.entries(obj.fields).map(([k, x]) => [k, plain(x, heap, depth + 1)]));
  }
  return obj.repr;
}

function linkedList(start: Value, heap: Record<string, HeapObject>): unknown[] {
  const out: unknown[] = [];
  const seen = new Set<number>();
  let cur = start;
  while (cur && typeof cur === "object" && "ref" in cur && !seen.has(cur.ref)) {
    seen.add(cur.ref);
    const node = heap[String(cur.ref)] as { fields: Record<string, Value> };
    out.push(node.fields.val);
    cur = node.fields.next;
  }
  return out;
}

function levelOrder(root: Value, heap: Record<string, HeapObject>): unknown[] {
  const out: unknown[] = [];
  const queue: Value[] = [root];
  while (queue.length) {
    const cur = queue.shift()!;
    if (!cur || typeof cur !== "object" || !("ref" in cur)) { out.push(null); continue; }
    const node = heap[String(cur.ref)] as { fields: Record<string, Value> };
    out.push(node.fields.val);
    queue.push(node.fields.left ?? null, node.fields.right ?? null);
  }
  while (out.length && out.at(-1) === null) out.pop();
  return out;
}

export function sameResult(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
