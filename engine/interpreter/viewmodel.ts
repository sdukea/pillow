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
  | { kind: "call-stack"; id: string; label: string; frames: { fn: string; detail: string; active: boolean }[] };

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

function buildView(spec: ViewSpec, ctx: { step: Step; moment: Moment; scope: Scope; active: Scope; focus?: LineSpec["focus"]; trace: Trace; tree?: TreeLayout; returns?: Map<number, Value> }): ViewModel {
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
        // Characters of a string read as plain letters; list items read as Python values.
        return { index, text: isString && typeof v === "string" ? v : describeValue(v, heap), state, focused: focusAt === index };
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
        return { key: describeValue(k, heap), value: describeValue(v, heap), state, focused: !!focusKey?.ok && sameValue(focusKey.v, k) };
      }) : [];
      const removed = own.flatMap((c) => (c.kind === "dict-delete" ? [describeValue(c.key, heap)] : []));
      return { kind: "map", id: spec.id, label, present: !!obj, entries, removed };
    }
    case "set": {
      const target = tryEval(spec.of, active);
      const obj = target.ok ? deref(target.v, heap) : undefined;
      const own = target.ok && isRef(target.v) ? changesFor(target.v.ref, moment.changes) : [];
      const focusKey = focus?.key ? tryEval(focus.key, ctx.scope) : undefined;
      const items = obj && "items" in obj ? obj.items.map((v) => ({
        text: describeValue(v, heap),
        state: (own.some((c) => c.kind === "set-add" && sameValue(c.value, v)) ? "added" : "same") as CellState,
        focused: !!focusKey?.ok && sameValue(focusKey.v, v),
      })) : [];
      const removed = own.flatMap((c) => (c.kind === "set-remove" ? [describeValue(c.value, heap)] : []));
      return { kind: "set", id: spec.id, label, present: !!obj, items, removed };
    }
    case "stack":
    case "queue": {
      const target = tryEval(spec.of, active);
      const obj = target.ok ? deref(target.v, heap) : undefined;
      const own = target.ok && isRef(target.v) ? changesFor(target.v.ref, moment.changes) : [];
      const list = obj && "items" in obj ? obj.items : [];
      const items = list.map((v, i) => ({
        text: describeValue(v, heap),
        state: (own.some((c) => (c.kind === "push" && i === list.length - 1) || (c.kind === "unshift" && i === 0)) ? "added" : "same") as CellState,
      }));
      const removed = own.flatMap((c) => (c.kind === "pop" || c.kind === "shift" ? [describeValue(c.value, heap)] : []));
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
      const onStack = new Set(step.frames.flatMap((f) => { const v = f.locals[spec.current]; return isRef(v) ? [v.ref] : []; }));
      const nodes = [...layout.nodes.entries()].map(([id, pos]) => {
        const obj = heap[String(id)] ?? ctx.trace.steps[0].heap[String(id)];
        const val = obj && "fields" in obj ? obj.fields.val : null;
        const ret = ctx.returns?.get(id);
        return { id, text: describeValue(val ?? null, heap), x: pos.x, y: pos.y, current: cur.ok && isRef(cur.v) && cur.v.ref === id, onStack: onStack.has(id), returned: ret === undefined ? undefined : describeValue(ret, heap) };
      });
      return { kind: "tree", id: spec.id, label: spec.label ?? "tree", nodes, edges: layout.edges };
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
  const treeSpec = spec.views.find((v): v is Extract<ViewSpec, { kind: "tree" }> => v.kind === "tree");
  let tree: TreeLayout | undefined;
  let returns: Map<number, Value>[] | undefined;
  if (treeSpec) {
    const first = steps[0];
    const root = tryEval(treeSpec.root, { locals: first.frames[0].locals, heap: first.heap });
    tree = root.ok && isRef(root.v) ? layoutTree(root.v.ref, first.heap) : { nodes: new Map(), edges: [] };
    returns = treeReturns(moments, steps, treeSpec.current);
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
    const views = spec.views.map((v) => buildView(v, { step, moment, scope, active, focus: lineSpec?.focus, trace, tree, returns: returns?.[moment.index] }));
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
