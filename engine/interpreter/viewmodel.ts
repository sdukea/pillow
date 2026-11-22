// View models: everything a renderer needs to draw one moment, computed from the trace and spec.
// Renderers stay generic and dumb; all meaning is decided here, and it's all derived from real state.

import type { Step, Trace, Value } from "../tracer/types";
import { evaluate, ExprError, type Scope } from "./expr";
import { buildMoments, scopeAt, type Change, type Moment } from "./moments";
import { narrate } from "./narrate";
import type { LineSpec, ViewSpec, VizSpec } from "./spec";
import { deref, format, format as formatValue, type Heap, isRef, sameValue } from "./values";

export type CellState = "same" | "added" | "updated";

export type ViewModel =
  | { kind: "array"; id: string; label: string; present: boolean; cells: { index: number; text: string; state: CellState; focused: boolean }[]; pointers: { name: string; index: number; moved: boolean }[]; range?: { from: number; to: number; label: string } }
  | { kind: "map"; id: string; label: string; present: boolean; entries: { key: string; value: string; state: CellState; focused: boolean }[]; removed: string[] }
  | { kind: "set"; id: string; label: string; present: boolean; items: { text: string; state: CellState; focused: boolean }[]; removed: string[] }
  | { kind: "stack" | "queue"; id: string; label: string; present: boolean; items: { text: string; state: CellState }[]; removed: string[] }
  | { kind: "vars"; id: string; label: string; vars: { name: string; text: string; changed: boolean; present: boolean }[] }
  | { kind: "linked-list"; id: string; label: string; nodes: { id: number; text: string; next: number | null; nextChanged: boolean; pointers: string[] }[] }
  | { kind: "tree"; id: string; label: string; nodes: { id: number; text: string; x: number; y: number; current: boolean; onStack: boolean; returned?: string }[]; edges: { from: number; to: number }[] }
  | { kind: "call-stack"; id: string; label: string; frames: { fn: string; detail: string; active: boolean }[] }
  | { kind: "grid"; id: string; label: string; present: boolean; rows: { text: string; state: CellState; focused: boolean; pointers: string[] }[][] }
  | { kind: "heap"; id: string; label: string; present: boolean; items: { text: string; state: CellState }[]; removed: string[] }
  | { kind: "graph"; id: string; label: string; present: boolean; directed: boolean; nodes: GraphNode[]; edges: { from: string; to: string; weight?: string; fresh: boolean }[] }
  | { kind: "union-find"; id: string; label: string; present: boolean; nodes: { key: string; parent: string; root: boolean; changed: boolean; x: number; y: number }[] };

export interface GraphNode { key: string; x: number; y: number; visited: boolean; current: boolean; frontier: boolean }

export interface MomentView {
  index: number;
  total: number;
  /** The line that just ran (highlighted as "ran"), if any. */
  ranLine?: number;
  /** The line that runs next (highlighted as "next"). */
  nextLine?: number;
  tag?: LineSpec["tag"];
  narration?: string;
  /** Plain-language list of what changed, e.g. "left: 0 → 3". */
  changes: string[];
  views: ViewModel[];
  depth: number;
  final: boolean;
  returned?: string;
  error?: string;
}

const describeValue = (v: Value, heap: Heap) => format(v, heap);
/**
 * An item drawn inside a list, set, map, queue or stack. Nodes read as their value ("9", not
 * "TreeNode(9)"), and single characters as plain letters ("a", not "'a'"). Digits and spaces keep
 * their quotes, so '1' isn't mistaken for 1. Variables still read as Python values.
 */
const describeItem = (v: Value, heap: Heap) => {
  if (typeof v === "string" && v.length === 1 && !/[\d\s]/.test(v)) return v;
  const obj = isRef(v) ? heap[String(v.ref)] : undefined;
  return obj && "fields" in obj && "val" in obj.fields ? format(obj.fields.val, heap) : format(v, heap);
};

function tryEval(expr: string, scope: Scope): { ok: true; v: Value } | { ok: false } {
  try {
    return { ok: true, v: evaluate(expr, scope) };
  } catch (e) {
    if (e instanceof ExprError) return { ok: false };
    throw e;
  }
}


function changesFor(ref: number, changes: Change[]) {
  return changes.filter((c) => "ref" in c && c.ref === ref);
}

// ------------------------------------------------------------------ precomputed, whole-trace layouts

interface TreeLayout { nodes: Map<number, { x: number; y: number }>; edges: { from: number; to: number }[] }

function layoutTree(rootRef: number, heap: Heap): TreeLayout {
  const nodes = new Map<number, { x: number; y: number }>();
  const edges: TreeLayout["edges"] = [];
  let x = 0;
  const visit = (ref: number, y: number) => {
    const obj = heap[String(ref)];
    if (!obj || !("fields" in obj)) return;
    const { left, right } = obj.fields;
    if (isRef(left)) { edges.push({ from: ref, to: left.ref }); visit(left.ref, y + 1); }
    nodes.set(ref, { x: x++, y });
    if (isRef(right)) { edges.push({ from: ref, to: right.ref }); visit(right.ref, y + 1); }
  };
  visit(rootRef, 0);
  return { nodes, edges };
}

/** Every node a call has returned for, so far: node id → returned value. */
function treeReturns(moments: Moment[], steps: Step[], current: string): Map<number, Value>[] {
  const out: Map<number, Value>[] = [];
  let acc = new Map<number, Value>();
  for (const m of moments) {
    const ret = m.changes.find((c) => c.kind === "return");
    if (ret) {
      const step = steps[m.stepIndex];
      const r = tryEval(current, { locals: step.frames.at(-1)!.locals, heap: step.heap });
      if (r.ok && isRef(r.v)) { acc = new Map(acc); acc.set(r.v.ref, (ret as { value: Value }).value); }
    }
    out.push(acc);
  }
  return out;
}

// ------------------------------------------------------------------ per-view builders

function buildView(spec: ViewSpec, ctx: { step: Step; prev?: Step; moment: Moment; scope: Scope; active: Scope; focus?: LineSpec["focus"]; trace: Trace; tree?: TreeLayout; returns?: Map<number, Value>; graphs?: Map<string, Map<string, { x: number; y: number }>> }): ViewModel {
  const { step, moment, active } = ctx;
  const label = spec.label ?? ("of" in spec ? spec.of : spec.id);
  const heap = step.heap;
  const focus = ctx.focus && ctx.focus.view === spec.id ? ctx.focus : undefined;
  const rebound = new Set(moment.changes.flatMap((c) => (c.kind === "rebind" || c.kind === "assign" ? [c.name] : [])));

  switch (spec.kind) {
    case "array": {
      const target = tryEval(spec.of, active);
      const obj = target.ok ? deref(target.v, heap) : undefined;
      const values: Value[] = target.ok && typeof target.v === "string" ? [...target.v] : obj && "items" in obj ? obj.items : [];
      const own = target.ok && isRef(target.v) ? changesFor(target.v.ref, moment.changes) : [];
      const focusIndex = focus?.index ? tryEval(focus.index, ctx.scope) : undefined;
      const focusAt = focusIndex?.ok ? focusIndex.v : undefined;
      const isString = target.ok && typeof target.v === "string";
      const cells = values.map((v, index) => {
        let state: CellState = "same";
        for (const c of own) {
          if (c.kind === "set-item" && c.index === index) state = "updated";
          if (c.kind === "push" && index === values.length - 1) state = "added";
        }
        // Characters of a string read as plain letters; list items as items.
        return { index, text: isString && typeof v === "string" ? v : describeItem(v, heap), state, focused: focusAt === index };
      });
      const pointers = (spec.pointers ?? []).flatMap((name) => {
        const p = tryEval(name, active);
        return p.ok && typeof p.v === "number" ? [{ name, index: p.v, moved: rebound.has(name) }] : [];
      });
      let range: { from: number; to: number; label: string } | undefined;
      if (spec.range) {
        const a = tryEval(spec.range.from, active), b = tryEval(spec.range.to, active);
        if (a.ok && b.ok && typeof a.v === "number" && typeof b.v === "number") range = { from: a.v, to: b.v, label: spec.range.label ?? "" };
      }
      return { kind: "array", id: spec.id, label, present: target.ok, cells, pointers, range };
    }
    case "map": {
      const target = tryEval(spec.of, active);
      const obj = target.ok ? deref(target.v, heap) : undefined;
      const own = target.ok && isRef(target.v) ? changesFor(target.v.ref, moment.changes) : [];
      const focusKey = focus?.key ? tryEval(focus.key, ctx.scope) : undefined;
      const entries = obj && "entries" in obj ? obj.entries.map(([k, v]) => {
        const c = own.find((x) => x.kind === "dict-set" && sameValue(x.key, k));
        const state: CellState = !c ? "same" : (c as { from?: Value }).from === undefined ? "added" : "updated";
        return { key: describeItem(k, heap), value: describeValue(v, heap), state, focused: !!focusKey?.ok && sameValue(focusKey.v, k) };
      }) : [];
      const removed = own.flatMap((c) => (c.kind === "dict-delete" ? [describeItem(c.key, heap)] : []));
      return { kind: "map", id: spec.id, label, present: !!obj, entries, removed };
    }
    case "set": {
      const target = tryEval(spec.of, active);
      const obj = target.ok ? deref(target.v, heap) : undefined;
      const own = target.ok && isRef(target.v) ? changesFor(target.v.ref, moment.changes) : [];
      const focusKey = focus?.key ? tryEval(focus.key, ctx.scope) : undefined;
      const items = obj && "items" in obj ? obj.items.map((v) => ({
        text: describeItem(v, heap),
        state: (own.some((c) => c.kind === "set-add" && sameValue(c.value, v)) ? "added" : "same") as CellState,
        focused: !!focusKey?.ok && sameValue(focusKey.v, v),
      })) : [];
      const removed = own.flatMap((c) => (c.kind === "set-remove" ? [describeItem(c.value, heap)] : []));
      return { kind: "set", id: spec.id, label, present: !!obj, items, removed };
    }
    case "stack":
    case "queue": {
      const target = tryEval(spec.of, active);
      const obj = target.ok ? deref(target.v, heap) : undefined;
      const own = target.ok && isRef(target.v) ? changesFor(target.v.ref, moment.changes) : [];
      const list = obj && "items" in obj ? obj.items : [];
      const items = list.map((v, i) => ({
        text: describeItem(v, heap),
        state: (own.some((c) => (c.kind === "push" && i === list.length - 1) || (c.kind === "unshift" && i === 0)) ? "added" : "same") as CellState,
      }));
      const removed = own.flatMap((c) => (c.kind === "pop" || c.kind === "shift" ? [describeItem(c.value, heap)] : []));
      return { kind: spec.kind, id: spec.id, label, present: !!obj, items, removed };
    }
    case "vars": {
      const vars = spec.show.map((expr) => {
        const r = tryEval(expr, active);
        const names = expr.match(/[A-Za-z_]\w*/g) ?? [];
        return { name: expr, text: r.ok ? describeValue(r.v, heap) : "", present: r.ok, changed: r.ok && names.some((n) => rebound.has(n)) };
      });
      return { kind: "vars", id: spec.id, label: spec.label ?? "variables", vars };
    }
    case "linked-list": {
      const nodes: { id: number; text: string; next: number | null; nextChanged: boolean; pointers: string[] }[] = [];
      const locals = active.locals;
      for (const [key, obj] of Object.entries(heap)) {
        if (!obj || !("fields" in obj) || !("next" in obj.fields)) continue;
        const id = Number(key);
        const next = obj.fields.next;
        nodes.push({
          id,
          text: describeValue(obj.fields.val ?? null, heap),
          next: isRef(next) ? next.ref : null,
          nextChanged: moment.changes.some((c) => c.kind === "field" && c.ref === id && c.field === "next"),
          pointers: spec.pointers.filter((p) => { const v = locals[p]; return isRef(v) && v.ref === id; }),
        });
      }
      // Stable order: ids are assigned along the original list, so sorting by id keeps nodes still.
      nodes.sort((a, b) => a.id - b.id);
      return { kind: "linked-list", id: spec.id, label: spec.label ?? "list", nodes };
    }
    case "tree": {
      const layout = ctx.tree!;
      const cur = tryEval(spec.current, active);
      let onStack: Set<number>;
      if (spec.waiting) {
        const w = tryEval(spec.waiting, active);
        const obj = w.ok ? deref(w.v, heap) : undefined;
        onStack = new Set(obj && "items" in obj ? obj.items.flatMap((x) => (isRef(x) ? [x.ref] : [])) : []);
      } else {
        onStack = new Set(step.frames.flatMap((f) => { const v = f.locals[spec.current]; return isRef(v) ? [v.ref] : []; }));
      }
      const nodes = [...layout.nodes.entries()].map(([id, pos]) => {
        const obj = heap[String(id)] ?? ctx.trace.steps[0].heap[String(id)];
        const val = obj && "fields" in obj ? obj.fields.val : null;
        const ret = ctx.returns?.get(id);
        return { id, text: describeValue(val ?? null, heap), x: pos.x, y: pos.y, current: cur.ok && isRef(cur.v) && cur.v.ref === id, onStack: onStack.has(id), returned: ret === undefined ? undefined : describeValue(ret, heap) };
      });
      return { kind: "tree", id: spec.id, label: spec.label ?? "tree", nodes, edges: layout.edges };
    }
    case "grid": {
      const target = tryEval(spec.of, active);
      const obj = target.ok ? deref(target.v, heap) : undefined;
      const rowRefs = obj && "items" in obj ? obj.items : [];
      const cells = (focus?.cells ?? []).flatMap(([r, c]) => {
        const a = tryEval(r, ctx.scope), b = tryEval(c, ctx.scope);
        return a.ok && b.ok && typeof a.v === "number" && typeof b.v === "number" ? [`${a.v},${b.v}`] : [];
      });
      const focused = new Set(cells);
      const pointed = new Map<string, string[]>();
      for (const p of spec.pointers ?? []) {
        const a = tryEval(p.row, active), b = tryEval(p.col, active);
        if (a.ok && b.ok && typeof a.v === "number" && typeof b.v === "number") {
          const k = `${a.v},${b.v}`;
          pointed.set(k, [...(pointed.get(k) ?? []), p.label ?? `${p.row}, ${p.col}`]);
        }
      }
      const rows = rowRefs.map((rowRef, r) => {
        const row = deref(rowRef, heap);
        const items = row && "items" in row ? row.items : [];
        const own = isRef(rowRef) ? changesFor(rowRef.ref, moment.changes) : [];
        return items.map((v, c) => {
          const state: CellState = own.some((x) => x.kind === "set-item" && x.index === c) ? "updated" : own.some((x) => x.kind === "push" && c === items.length - 1) ? "added" : "same";
          return { text: describeItem(v, heap), state, focused: focused.has(`${r},${c}`), pointers: pointed.get(`${r},${c}`) ?? [] };
        });
      });
      return { kind: "grid", id: spec.id, label, present: !!obj, rows };
    }
    case "heap": {
      const now = listAt(spec.of, active, heap);
      const before = ctx.prev ? listAt(spec.of, activeScope(ctx.prev), ctx.prev.heap) : undefined;
      const texts = (now ?? []).map((v) => describeItem(v, heap));
      const prevTexts = before ? before.map((v) => describeItem(v, ctx.prev!.heap)) : texts;
      const items = texts.map((text, i) => ({ text, state: (i >= prevTexts.length ? "added" : prevTexts[i] !== text ? "updated" : "same") as CellState }));
      return { kind: "heap", id: spec.id, label, present: !!now, items, removed: multisetMinus(prevTexts, texts) };
    }
    case "graph": {
      const layout = ctx.graphs?.get(spec.id) ?? new Map();
      const adj = adjacencyAt(spec.of, active, heap);
      const prevAdj = ctx.prev ? adjacencyAt(spec.of, activeScope(ctx.prev), ctx.prev.heap) : undefined;
      const keysOf = (expr?: string) => {
        if (!expr) return new Set<string>();
        const r = tryEval(expr, active);
        if (!r.ok) return new Set<string>();
        const obj = deref(r.v, heap);
        if (obj && "items" in obj) return new Set(obj.items.map((v) => describeItem(v, heap)));
        if (obj && "entries" in obj) return new Set(obj.entries.map(([k]) => describeItem(k, heap)));
        return new Set([describeItem(r.v, heap)]);
      };
      const visited = keysOf(spec.visited), frontier = keysOf(spec.frontier);
      const cur = spec.current ? tryEval(spec.current, active) : undefined;
      const current = cur?.ok ? describeItem(cur.v, heap) : undefined;
      const nodes = [...layout.entries()].map(([key, pos]) => ({ key, x: pos.x, y: pos.y, visited: visited.has(key), current: key === current, frontier: frontier.has(key) }));
      const had = new Set((prevAdj?.edges ?? []).map((e) => `${e.from}>${e.to}`));
      const directed = spec.directed ?? false;
      const seen = new Set<string>();
      const edges = (adj?.edges ?? []).filter((e) => {
        if (directed) return true;
        const k = [e.from, e.to].sort().join("~");
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }).map((e) => ({ ...e, fresh: !!prevAdj && !had.has(`${e.from}>${e.to}`) && (directed || !had.has(`${e.to}>${e.from}`)) }));
      return { kind: "graph", id: spec.id, label, present: !!adj, directed, nodes, edges };
    }
    case "union-find": {
      const now = parentsAt(spec.of, active, heap, spec.start ?? 0);
      const before = ctx.prev ? parentsAt(spec.of, activeScope(ctx.prev), ctx.prev.heap, spec.start ?? 0) : undefined;
      if (!now) return { kind: "union-find", id: spec.id, label, present: false, nodes: [] };
      return { kind: "union-find", id: spec.id, label, present: true, nodes: layoutForest(now, before) };
    }
    case "call-stack": {
      const frames = step.frames.map((f, i) => {
        const scope = { locals: f.locals, heap };
        const detail = spec.show.flatMap((expr) => { const r = tryEval(expr, scope); return r.ok ? [`${expr} = ${describeValue(r.v, heap)}`] : []; }).join(", ");
        return { fn: f.fn, detail, active: i === step.frames.length - 1 };
      });
      return { kind: "call-stack", id: spec.id, label: spec.label ?? "call stack", frames };
    }
  }
}

// ------------------------------------------------------------------ helpers for the newer views

const activeScope = (step: Step): Scope => ({ locals: step.frames.at(-1)?.locals ?? {}, heap: step.heap });

/** The items of the list (or deque) an expression names, or undefined if it doesn't exist here. */
function listAt(expr: string, scope: Scope, heap: Heap): Value[] | undefined {
  const r = tryEval(expr, scope);
  const obj = r.ok ? deref(r.v, heap) : undefined;
  return obj && "items" in obj ? obj.items : undefined;
}

/** What's in `before` but not in `after`, counting repeats. */
function multisetMinus(before: string[], after: string[]): string[] {
  const left = new Map<string, number>();
  for (const t of after) left.set(t, (left.get(t) ?? 0) + 1);
  return before.filter((t) => { const n = left.get(t) ?? 0; if (n) { left.set(t, n - 1); return false; } return true; });
}

/** Nodes and edges of an adjacency dict ({u: [v, …]}) or list ([[v, …], …]); a neighbour may be a (v, weight) pair. */
function adjacencyAt(expr: string, scope: Scope, heap: Heap): { nodes: string[]; edges: { from: string; to: string; weight?: string }[] } | undefined {
  const r = tryEval(expr, scope);
  const obj = r.ok ? deref(r.v, heap) : undefined;
  if (!obj) return undefined;
  const rows: [string, Value][] = "entries" in obj ? obj.entries.map(([k, v]) => [describeItem(k, heap), v])
    : "items" in obj ? obj.items.map((v, i) => [String(i), v]) : [];
  if (!("entries" in obj) && !("items" in obj)) return undefined;
  const nodes = rows.map(([k]) => k);
  const edges: { from: string; to: string; weight?: string }[] = [];
  for (const [from, list] of rows) {
    const l = deref(list, heap);
    for (const n of l && "items" in l ? l.items : []) {
      const pair = deref(n, heap);
      if (pair && "items" in pair && pair.items.length === 2) edges.push({ from, to: describeItem(pair.items[0], heap), weight: describeItem(pair.items[1], heap) });
      else edges.push({ from, to: describeItem(n, heap) });
    }
  }
  for (const e of edges) if (!nodes.includes(e.to)) nodes.push(e.to);
  return { nodes, edges };
}

/** Every node the graph ever has, placed once on a circle so nothing moves during the run. */
function layoutGraph(expr: string, steps: Step[]): Map<string, { x: number; y: number }> {
  const all: string[] = [];
  for (const s of steps) for (const n of adjacencyAt(expr, activeScope(s), s.heap)?.nodes ?? []) if (!all.includes(n)) all.push(n);
  const numeric = all.every((k) => /^-?\d+$/.test(k));
  all.sort((a, b) => (numeric ? Number(a) - Number(b) : a.localeCompare(b)));
  const out = new Map<string, { x: number; y: number }>();
  all.forEach((k, i) => {
    const t = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(all.length, 1);
    out.set(k, { x: 0.5 + 0.42 * Math.cos(t), y: 0.5 + 0.42 * Math.sin(t) });
  });
  return out;
}

/** Item → parent, from a parent list (from index `start`) or dict. */
function parentsAt(expr: string, scope: Scope, heap: Heap, start: number): Map<string, string> | undefined {
  const r = tryEval(expr, scope);
  const obj = r.ok ? deref(r.v, heap) : undefined;
  if (!obj) return undefined;
  if ("items" in obj) return new Map(obj.items.slice(start).map((v, i) => [String(i + start), describeItem(v, heap)]));
  if ("entries" in obj) return new Map(obj.entries.map(([k, v]) => [describeItem(k, heap), describeItem(v, heap)]));
  return undefined;
}

/** A forest, roots along the top in item order and each child under its parent: x is a leaf slot, y the depth. */
function layoutForest(parents: Map<string, string>, before?: Map<string, string>) {
  const keys = [...parents.keys()];
  const children = new Map<string, string[]>(keys.map((k) => [k, []]));
  const roots: string[] = [];
  for (const k of keys) {
    const p = parents.get(k)!;
    if (p === k || !parents.has(p)) roots.push(k);
    else children.get(p)!.push(k);
  }
  const pos = new Map<string, { x: number; y: number }>();
  let slot = 0;
  const place = (k: string, depth: number, path: Set<string>) => {
    if (path.has(k)) return; // a cycle mid-update: draw what we can
    const kids = children.get(k)!;
    const next = new Set(path).add(k);
    if (!kids.length) pos.set(k, { x: slot++, y: depth });
    else {
      kids.forEach((c) => place(c, depth + 1, next));
      const xs = kids.map((c) => pos.get(c)?.x ?? slot);
      pos.set(k, { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: depth });
    }
  };
  roots.forEach((r) => place(r, 0, new Set()));
  for (const k of keys) if (!pos.has(k)) pos.set(k, { x: slot++, y: 0 });
  return keys.map((k) => ({ key: k, parent: parents.get(k)!, root: roots.includes(k), changed: !!before && before.get(k) !== parents.get(k), ...pos.get(k)! }));
}

function describeChange(c: Change, heap: Heap, names: (ref: number) => string): string | undefined {
  // In change lines, nodes read as "node 2" rather than "ListNode(2)".
  const format = (v: Value, h: Heap) => {
    const obj = isRef(v) ? h[String(v.ref)] : undefined;
    return obj && "fields" in obj && "val" in obj.fields ? `node ${formatValue(obj.fields.val, h)}` : formatValue(v, h);
  };
  switch (c.kind) {
    case "assign": return `${c.name} = ${format(c.value, heap)}`;
    case "rebind": return `${c.name}: ${format(c.from, heap)} → ${format(c.to, heap)}`;
    case "push": return `${names(c.ref)}: added ${format(c.value, heap)} at the end`;
    case "pop": return `${names(c.ref)}: removed ${format(c.value, heap)} from the end`;
    case "shift": return `${names(c.ref)}: removed ${format(c.value, heap)} from the front`;
    case "unshift": return `${names(c.ref)}: added ${format(c.value, heap)} at the front`;
    case "set-item": return `${names(c.ref)}[${c.index}]: ${format(c.from, heap)} → ${format(c.to, heap)}`;
    case "list-change": return `${names(c.ref)} changed`;
    case "dict-set": return c.from === undefined ? `${names(c.ref)}[${format(c.key, heap)}] = ${format(c.to, heap)}` : `${names(c.ref)}[${format(c.key, heap)}]: ${format(c.from, heap)} → ${format(c.to, heap)}`;
    case "dict-delete": return `${names(c.ref)}: removed key ${format(c.key, heap)}`;
    case "set-add": return `${names(c.ref)}: added ${format(c.value, heap)}`;
    case "set-remove": return `${names(c.ref)}: removed ${format(c.value, heap)}`;
    case "field": return `${format({ ref: c.ref }, heap)}.${c.field}: ${format(c.from, heap)} → ${format(c.to, heap)}`;
    case "call": return `called ${c.fn}(${Object.entries(c.args).map(([k, v]) => `${k}=${format(v, heap)}`).join(", ")})`;
    case "return": return `${c.fn} returned ${format(c.value, heap)}`;
    case "exception": return `${c.type}: ${c.message}`;
  }
}

/**
 * Narration for custom inputs may meet a state the validator never saw. Skip the sentence rather
 * than crash; the build-time validator is what guarantees it on the shipped examples.
 */
function safeNarrate(lineSpec: LineSpec, scope: Scope): string | undefined {
  try {
    return narrate(lineSpec.narrate, scope);
  } catch (e) {
    if (e instanceof ExprError) return undefined;
    throw e;
  }
}

/** A prepared trace: moments plus everything needed to render any of them quickly. */
export interface Prepared {
  trace: Trace;
  spec: VizSpec;
  moments: Moment[];
  view(index: number): MomentView;
}

export function prepare(trace: Trace, spec: VizSpec): Prepared {
  const moments = buildMoments(trace);
  const steps = trace.steps;
  const graphs = new Map<string, Map<string, { x: number; y: number }>>();
  for (const v of spec.views) if (v.kind === "graph") graphs.set(v.id, layoutGraph(v.of, steps));
  const treeSpec = spec.views.find((v): v is Extract<ViewSpec, { kind: "tree" }> => v.kind === "tree");
  let tree: TreeLayout | undefined;
  let returns: Map<number, Value>[] | undefined;
  if (treeSpec) {
    const first = steps[0];
    const root = tryEval(treeSpec.root, { locals: first.frames[0].locals, heap: first.heap });
    tree = root.ok && isRef(root.v) ? layoutTree(root.v.ref, first.heap) : { nodes: new Map(), edges: [] };
    if (treeSpec.showReturns !== false) returns = treeReturns(moments, steps, treeSpec.current);
  }

  function view(index: number): MomentView {
    const moment = moments[Math.max(0, Math.min(index, moments.length - 1))];
    const step = steps[moment.stepIndex];
    const scope = scopeAt(moment, step);
    const active: Scope = { locals: step.frames.at(-1)!.locals, heap: step.heap };
    const lineSpec = moment.executed ? spec.lines[moment.executed.line] : undefined;
    const names = (ref: number) => {
      const holders = Object.entries(active.locals).filter(([, v]) => isRef(v) && v.ref === ref).map(([k]) => k);
      return holders[0] ?? "list";
    };
    const prevMoment = moment.index > 0 ? moments[moment.index - 1] : undefined;
    const prev = prevMoment ? steps[prevMoment.stepIndex] : undefined;
    const views = spec.views.map((v) => buildView(v, { step, prev, moment, scope, active, focus: lineSpec?.focus, trace, tree, returns: returns?.[moment.index], graphs }));
    const ret = moment.changes.find((c) => c.kind === "return") as { value: Value } | undefined;
    const exc = moment.changes.find((c) => c.kind === "exception") as { type: string; message: string } | undefined;
    return {
      index: moment.index,
      total: moments.length,
      ranLine: moment.executed?.line,
      nextLine: step.event === "return" ? undefined : step.line,
      tag: lineSpec?.tag,
      narration: lineSpec ? safeNarrate(lineSpec, scope) : undefined,
      changes: moment.changes.flatMap((c) => describeChange(c, step.heap, names) ?? []),
      views,
      depth: moment.depth,
      final: moment.final,
      returned: ret && moment.final ? format(ret.value, step.heap) : undefined,
      error: exc ? `${exc.type}: ${exc.message}` : undefined,
    };
  }

  return { trace, spec, moments, view };
}
