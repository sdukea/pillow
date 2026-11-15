// Custom inputs: what a learner can type for each problem, how it's parsed, and how it reads back.
// Only data crosses into Python, never code: the parsed values become tracer `args` for the
// fixed reference solutions. Limits keep every run small enough to draw and to step through.

import type { Arg } from "../../engine/tracer/types";

export type FieldType = "int" | "int-list" | "string" | "tree" | "linked-list";

export interface InputField {
  /** The parameter name, as in the solution's signature. */
  name: string;
  type: FieldType;
  /** Most items (lists, trees) or characters (strings). Required for those types. */
  max?: number;
  /** Fewest items or characters. Default 0. */
  min?: number;
  /** A short hint under the field, e.g. "Sorted, no repeats". */
  hint?: string;
  /** An extra rule. Returns a plain-language problem, or null if the value is fine. */
  rule?: (value: unknown) => string | null;
}

export const LIMIT = 9999;

export type Parsed = { ok: true; args: Arg[] } | { ok: false; field: string; message: string };

/** Parse one text per field. Errors name the field and say how to fix the input. */
export function parseInputs(fields: InputField[], texts: string[]): Parsed {
  const args: Arg[] = [];
  for (const [i, f] of fields.entries()) {
    const r = parseField(f, texts[i] ?? "");
    if (typeof r === "string") return { ok: false, field: f.name, message: r };
    const rule = f.rule?.(argValue(r));
    if (rule) return { ok: false, field: f.name, message: rule };
    args.push(r);
  }
  return { ok: true, args };
}

function parseField(f: InputField, raw: string): Arg | string {
  const text = raw.trim();
  switch (f.type) {
    case "int": {
      const n = parseInt_(text);
      return typeof n === "string" ? n : { kind: "value", value: n };
    }
    case "string": {
      // Strings are typed as they are, without quotes. Strip one pair if someone adds them anyway.
      const s = /^(["']).*\1$/s.test(text) && text.length >= 2 ? text.slice(1, -1) : raw.replace(/^\s+|\s+$/g, "");
      if (/[\n\r\t]/.test(s)) return "Use a single line, without tabs.";
      if (s.length > (f.max ?? Infinity)) return `Use at most ${f.max} characters (this has ${s.length}).`;
      if (s.length < (f.min ?? 0)) return `Use at least ${f.min} characters.`;
      return { kind: "value", value: s };
    }
    case "int-list":
    case "linked-list": {
      const items = parseList(text, false);
      if (typeof items === "string") return items;
      const err = countError(f, items.length, "numbers");
      if (err) return err;
      return f.type === "int-list" ? { kind: "value", value: items } : { kind: "linked_list", values: items };
    }
    case "tree": {
      const items = parseList(text, true);
      if (typeof items === "string") return items;
      if (items.length && items[0] === null) return "The root can’t be null. Use [] for an empty tree.";
      const nodes = items.filter((x) => x !== null).length;
      const err = countError(f, nodes, "nodes");
      if (err) return err;
      const unreachable = treeUnreachable(items);
      if (unreachable) return unreachable;
      // Trailing nulls change nothing; drop them so the tree reads the way LeetCode writes it.
      while (items.length && items.at(-1) === null) items.pop();
      return { kind: "tree", values: items };
    }
  }
}

function parseInt_(text: string): number | string {
  if (!/^[-+]?\d+$/.test(text)) return text ? `“${text}” isn’t a whole number.` : "Enter a whole number.";
  const n = Number(text);
  if (Math.abs(n) > LIMIT) return `Keep numbers between −${LIMIT} and ${LIMIT}.`;
  return n;
}

/** "[1, 2, null]" or "1, 2, null". Brackets are optional; "None" works as well as "null". */
function parseList(text: string, allowNull: boolean): (number | null)[] | string {
  let body = text;
  if (body.startsWith("[") !== body.endsWith("]")) return "Check the brackets: a list looks like [1, 2, 3].";
  if (body.startsWith("[")) body = body.slice(1, -1);
  if (!body.trim()) return [];
  const out: (number | null)[] = [];
  for (const part of body.split(",")) {
    const t = part.trim();
    if (allowNull && /^(null|None)$/.test(t)) { out.push(null); continue; }
    if (!t) return "There’s an empty spot between two commas.";
    const n = parseInt_(t);
    if (typeof n === "string") return allowNull ? `${n} Use null for a missing child.` : n;
    out.push(n);
  }
  return out;
}

function countError(f: InputField, n: number, what: string): string | null {
  if (n > (f.max ?? Infinity)) return `Use at most ${f.max} ${what} (this has ${n}), so every step stays readable.`;
  if (n < (f.min ?? 0)) return `Use at least ${f.min} ${what}.`;
  return null;
}

/** In LeetCode's level-order format, a value under a null parent can never be attached. */
function treeUnreachable(items: (number | null)[]): string | null {
  let slots = 0; // empty child positions the nodes so far still offer
  for (let i = 0; i < items.length; i++) {
    if (i > 0) {
      if (slots === 0) return `${items[i] ?? "null"} has no parent to hang from. Remove it, or give it a non-null parent.`;
      slots--;
    }
    if (items[i] !== null) slots += 2;
  }
  return null;
}

function argValue(a: Arg): unknown {
  return a.kind === "value" ? a.value : a.values;
}

// ------------------------------------------------------------------ reading inputs back

/** The text a learner would type for an argument, used to fill the form. */
export function toText(field: InputField, arg: Arg): string {
  const v = argValue(arg);
  if (field.type === "string") return String(v);
  if (field.type === "int") return String(v);
  return `[${(v as unknown[]).map((x) => (x === null ? "null" : String(x))).join(", ")}]`;
}

/** How an input reads to a person, e.g. `nums = [2, 7], target = 9` or `head = 1 → 2 → 3`. */
export function labelOf(fields: InputField[], args: Arg[]): string {
  return fields
    .map((f, i) => {
      const v = argValue(args[i]);
      switch (f.type) {
        case "string": return `${f.name} = ${JSON.stringify(v)}`;
        case "int": return `${f.name} = ${v}`;
        case "linked-list": return `${f.name} = ${(v as unknown[]).length ? (v as unknown[]).join(" → ") : "None"}`;
        default: return `${f.name} = ${toText(f, args[i])}`;
      }
    })
    .join(", ");
}

// ------------------------------------------------------------------ shared rules

export const sortedUnique = (v: unknown) => {
  const xs = v as number[];
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] <= xs[i - 1]) return xs[i] === xs[i - 1] ? `${xs[i]} appears twice. Binary search here expects no repeats.` : `The list must be sorted: ${xs[i - 1]} comes before ${xs[i]}.`;
  }
  return null;
};

export const bracketsOnly = (v: unknown) => {
  const bad = [...String(v)].find((c) => !"()[]{}".includes(c));
  return bad === undefined ? null : `Use only the six bracket characters ( ) [ ] { }. “${bad}” isn’t one.`;
};
