// A tiny, safe expression language for narration and specs, evaluated against real trace state.
// Never uses eval. Supported (a Python-flavoured subset, since authors are reading Python):
//   names            seen, left, root
//   literals         0, -3, 'a', "a", None, True, False
//   indexing         nums[i], last_seen[ch]     (lists, tuples, dicts)
//   attributes       node.val, node.next
//   arithmetic       + - * // %
//   comparison       == != < <= > >=, in, not in
//   logic            and, or, not
//   calls            len(x), max(a, b), min(a, b), abs(x)
// Evaluation returns a traced Value, so results can be formatted exactly like the code's own values.

import type { Value } from "../tracer/types";
import { deref, type Heap, isRef, sameValue } from "./values";

type Node =
  | { t: "lit"; v: Value }
  | { t: "name"; name: string }
  | { t: "index"; obj: Node; key: Node }
  | { t: "attr"; obj: Node; name: string }
  | { t: "unary"; op: "-" | "not"; arg: Node }
  | { t: "bin"; op: string; left: Node; right: Node }
  | { t: "call"; fn: string; args: Node[] };

export class ExprError extends Error {}

const TOKEN = /\s*(?:(\d+)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|([A-Za-z_]\w*)|(\/\/|==|!=|<=|>=|[-+*%<>()[\].,]))/y;

function tokenize(src: string): string[] {
  const out: string[] = [];
  TOKEN.lastIndex = 0;
  let pos = 0;
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break;
    TOKEN.lastIndex = pos;
    const m = TOKEN.exec(src);
    if (!m) throw new ExprError(`Can't read "${src.slice(pos).trim()}" in {${src}}`);
    out.push(m[1] ?? m[2] ?? m[3] ?? m[4]);
    pos = TOKEN.lastIndex;
  }
  return out;
}

const PRECEDENCE: Record<string, number> = { or: 1, and: 2, in: 4, "not in": 4, "==": 4, "!=": 4, "<": 4, "<=": 4, ">": 4, ">=": 4, "+": 5, "-": 5, "*": 6, "//": 6, "%": 6 };
const FUNCS = new Set(["len", "max", "min", "abs"]);

export function parse(src: string): Node {
  const toks = tokenize(src);
  let i = 0;
  const peek = () => toks[i];
  const take = (expect?: string) => {
    const t = toks[i++];
    if (expect !== undefined && t !== expect) throw new ExprError(`Expected "${expect}" in {${src}}`);
    if (t === undefined) throw new ExprError(`Unexpected end of {${src}}`);
    return t;
  };

  const binaryOp = (): string | null => {
    const t = peek();
    if (t === "not" && toks[i + 1] === "in") return "not in";
    return t !== undefined && t in PRECEDENCE ? t : null;
  };

  function primary(): Node {
    const t = take();
    let node: Node;
    if (t === "(") { node = expr(0); take(")"); }
    else if (t === "-") node = { t: "unary", op: "-", arg: primary() };
    else if (t === "not") node = { t: "unary", op: "not", arg: expr(3) };
    else if (/^\d+$/.test(t)) node = { t: "lit", v: Number(t) };
    else if (/^['"]/.test(t)) node = { t: "lit", v: t.slice(1, -1).replace(/\\(.)/g, "$1") };
    else if (t === "None") node = { t: "lit", v: null };
    else if (t === "True" || t === "False") node = { t: "lit", v: t === "True" };
    else if (/^[A-Za-z_]/.test(t)) {
      if (peek() === "(") {
        if (!FUNCS.has(t)) throw new ExprError(`Unknown function ${t}() in {${src}}`);
        take("(");
        const args: Node[] = [];
        while (peek() !== ")") { args.push(expr(0)); if (peek() === ",") take(","); }
        take(")");
        node = { t: "call", fn: t, args };
      } else node = { t: "name", name: t };
    } else throw new ExprError(`Unexpected "${t}" in {${src}}`);
    // postfix: indexing and attributes
    for (;;) {
      if (peek() === "[") { take("["); node = { t: "index", obj: node, key: expr(0) }; take("]"); }
      else if (peek() === ".") { take("."); node = { t: "attr", obj: node, name: take() }; }
      else return node;
    }
  }

  function expr(minPrec: number): Node {
    let left = primary();
    for (let op = binaryOp(); op && PRECEDENCE[op] > minPrec; op = binaryOp()) {
      take();
      if (op === "not in") take();
      left = { t: "bin", op, left, right: expr(PRECEDENCE[op]) };
    }
    return left;
  }

  const tree = expr(0);
  if (i < toks.length) throw new ExprError(`Unexpected "${toks[i]}" in {${src}}`);
  return tree;
}

const num = (v: Value, src: string): number => {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return Number(v);
  throw new ExprError(`{${src}} needs a number here`);
};

function truthy(v: Value, heap: Heap): boolean {
  if (v === null || v === false || v === 0 || v === "") return false;
  const obj = deref(v, heap);
  if (obj && "items" in obj) return obj.items.length > 0;
  if (obj && "entries" in obj) return obj.entries.length > 0;
  return true;
}

function contains(container: Value, needle: Value, heap: Heap): boolean {
  if (typeof container === "string" && typeof needle === "string") return container.includes(needle);
  const obj = deref(container, heap);
  if (!obj) throw new ExprError("`in` needs a list, set, dict or string");
  if ("items" in obj) return obj.items.some((x) => sameValue(x, needle));
  if ("entries" in obj) return obj.entries.some(([k]) => sameValue(k, needle));
  throw new ExprError("`in` needs a list, set, dict or string");
}

export interface Scope { locals: Record<string, Value>; heap: Heap }

function evalNode(n: Node, s: Scope, src: string): Value {
  switch (n.t) {
    case "lit": return n.v;
    case "name":
      if (!(n.name in s.locals)) throw new ExprError(`{${src}}: there's no variable "${n.name}" at this step`);
      return s.locals[n.name];
    case "attr": {
      const obj = deref(evalNode(n.obj, s, src), s.heap);
      if (!obj || !("fields" in obj) || !(n.name in obj.fields)) throw new ExprError(`{${src}}: no .${n.name} here`);
      return obj.fields[n.name];
    }
    case "index": {
      const base = evalNode(n.obj, s, src);
      const key = evalNode(n.key, s, src);
      if (typeof base === "string") {
        const k = num(key, src);
        const idx = k < 0 ? base.length + k : k;
        if (idx < 0 || idx >= base.length) throw new ExprError(`{${src}}: index ${k} is out of range`);
        return base[idx];
      }
      const obj = deref(base, s.heap);
      if (obj && "items" in obj) {
        const k = num(key, src);
        const idx = k < 0 ? obj.items.length + k : k;
        if (idx < 0 || idx >= obj.items.length) throw new ExprError(`{${src}}: index ${k} is out of range`);
        return obj.items[idx];
      }
      if (obj && "entries" in obj) {
        const hit = obj.entries.find(([k]) => sameValue(k, key));
        if (!hit) throw new ExprError(`{${src}}: the key isn't in the dict at this step`);
        return hit[1];
      }
      throw new ExprError(`{${src}}: can't index this value`);
    }
    case "unary": {
      const v = evalNode(n.arg, s, src);
      return n.op === "-" ? -num(v, src) : !truthy(v, s.heap);
    }
    case "call": {
      const args = n.args.map((a) => evalNode(a, s, src));
      if (n.fn === "len") {
        const v = args[0];
        if (typeof v === "string") return v.length;
        const obj = deref(v, s.heap);
        if (obj && "items" in obj) return obj.items.length;
        if (obj && "entries" in obj) return obj.entries.length;
        throw new ExprError(`{${src}}: len() needs a list, dict or string`);
      }
      if (n.fn === "abs") return Math.abs(num(args[0], src));
      const nums = args.map((a) => num(a, src));
      return n.fn === "max" ? Math.max(...nums) : Math.min(...nums);
    }
    case "bin": {
      if (n.op === "and") { const l = evalNode(n.left, s, src); return truthy(l, s.heap) ? evalNode(n.right, s, src) : l; }
      if (n.op === "or") { const l = evalNode(n.left, s, src); return truthy(l, s.heap) ? l : evalNode(n.right, s, src); }
      const l = evalNode(n.left, s, src), r = evalNode(n.right, s, src);
      switch (n.op) {
        case "in": return contains(r, l, s.heap);
        case "not in": return !contains(r, l, s.heap);
        case "==": return sameValue(l, r);
        case "!=": return !sameValue(l, r);
        case "+":
          if (typeof l === "string" && typeof r === "string") return l + r;
          return num(l, src) + num(r, src);
        case "-": return num(l, src) - num(r, src);
        case "*": return num(l, src) * num(r, src);
        case "//": return Math.floor(num(l, src) / num(r, src));
        case "%": { const b = num(r, src); return ((num(l, src) % b) + b) % b; }
        case "<": return compare(l, r, src) < 0;
        case "<=": return compare(l, r, src) <= 0;
        case ">": return compare(l, r, src) > 0;
        case ">=": return compare(l, r, src) >= 0;
      }
    }
  }
  throw new ExprError(`Can't evaluate {${src}}`);
}

function compare(a: Value, b: Value, src: string): number {
  if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0;
  return num(a, src) - num(b, src);
}

const cache = new Map<string, Node>();
export function evaluate(src: string, scope: Scope): Value {
  let tree = cache.get(src);
  if (!tree) { tree = parse(src); cache.set(src, tree); }
  return evalNode(tree, scope, src);
}

export function isTruthy(src: string, scope: Scope): boolean {
  return truthy(evaluate(src, scope), scope.heap);
}

export { isRef };
