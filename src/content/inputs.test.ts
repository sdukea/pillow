// Custom input: parsing, limits, and, most importantly, that every approach still traces,
// narrates and draws correctly on inputs nobody wrote a lesson for.
import { describe, expect, it } from "vitest";
import { validateSpec } from "../../engine/interpreter/validate";
import { prepare } from "../../engine/interpreter/viewmodel";
import { fixtureSource, traceCPython } from "../../engine/testing/trace";
import type { Arg } from "../../engine/tracer/types";
import { labelOf, parseInputs, toText } from "./inputs";
import { PROBLEMS, type Problem } from "./problems";

const problem = (slug: string) => PROBLEMS.find((p) => p.slug === slug)!;
const parse = (slug: string, ...texts: string[]) => parseInputs(problem(slug).inputs, texts);
const errorOf = (slug: string, ...texts: string[]) => {
  const r = parse(slug, ...texts);
  return r.ok ? null : r.message;
};

describe("parsing", () => {
  for (const p of PROBLEMS) {
    it(`${p.title}: the example and every edge case read back exactly and fit the limits`, () => {
      expect(p.inputs.length).toBe(p.example.length);
      for (const args of [p.example, ...(p.lesson?.edgeCases ?? [])]) {
        const r = parseInputs(p.inputs, p.inputs.map((f, i) => toText(f, args[i])));
        expect(r).toEqual({ ok: true, args });
      }
    });
  }

  it("reads lists with or without brackets, and None as null", () => {
    expect(parse("two-sum", "3, 2, 4", "6")).toEqual({ ok: true, args: [{ kind: "value", value: [3, 2, 4] }, { kind: "value", value: 6 }] });
    expect(parse("maximum-depth-of-binary-tree", "[1, None, 2]")).toEqual({ ok: true, args: [{ kind: "tree", values: [1, null, 2] }] });
  });

  it("drops trailing nulls from trees", () => {
    expect(parse("maximum-depth-of-binary-tree", "[1, 2, null, null, null]")).toEqual({ ok: true, args: [{ kind: "tree", values: [1, 2] }] });
  });

  it("takes strings as typed, and strips quotes if someone adds them", () => {
    expect(parse("longest-substring-without-repeating-characters", "a b")).toEqual({ ok: true, args: [{ kind: "value", value: "a b" }] });
    expect(parse("longest-substring-without-repeating-characters", "\"abc\"")).toEqual({ ok: true, args: [{ kind: "value", value: "abc" }] });
  });

  it("explains what's wrong, in plain language", () => {
    expect(errorOf("two-sum", "[1, two]", "3")).toMatch(/“two” isn’t a whole number/);
    expect(errorOf("two-sum", "[1]", "3")).toMatch(/at least 2 numbers/);
    expect(errorOf("two-sum", "[1, 2", "3")).toMatch(/brackets/);
    expect(errorOf("two-sum", "[1,,2]", "3")).toMatch(/empty spot/);
    expect(errorOf("two-sum", "[1, 2]", "100000")).toMatch(/between/);
    expect(errorOf("two-sum", `[${Array(13).fill(1).join(",")}]`, "2")).toMatch(/at most 12 numbers/);
    expect(errorOf("binary-search", "[1, 5, 3]", "3")).toMatch(/must be sorted/);
    expect(errorOf("binary-search", "[1, 3, 3]", "3")).toMatch(/appears twice/);
    expect(errorOf("valid-parentheses", "(a)")).toMatch(/“a” isn’t one/);
    expect(errorOf("valid-parentheses", "(".repeat(17))).toMatch(/at most 16 characters/);
    expect(errorOf("maximum-depth-of-binary-tree", "[null, 1]")).toMatch(/root can’t be null/);
    expect(errorOf("maximum-depth-of-binary-tree", "[1, null, null, 2]")).toMatch(/no parent/);
    expect(errorOf("reverse-linked-list", "[1, null]")).toMatch(/isn’t a whole number/);
  });

  it("labels inputs the way the examples are written", () => {
    expect(labelOf(problem("reverse-linked-list").inputs, [{ kind: "linked_list", values: [1, 2] }])).toBe("head = 1 → 2");
    expect(labelOf(problem("reverse-linked-list").inputs, [{ kind: "linked_list", values: [] }])).toBe("head = None");
    expect(labelOf(problem("valid-parentheses").inputs, [{ kind: "value", value: "()" }])).toBe('s = "()"');
    expect(labelOf(problem("two-sum").inputs, problem("two-sum").example)).toBe(problem("two-sum").exampleLabel);
  });
});

// ------------------------------------------------------------------ generated inputs
// A seeded generator, so failures reproduce.
function rng(seed: number) {
  return () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
}

function generate(p: Problem, r: () => number): Arg[] {
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  return p.inputs.map((f): Arg => {
    const max = f.max ?? 1;
    const n = int(f.min ?? 0, max);
    switch (f.type) {
      case "int": return { kind: "value", value: int(-20, 40) };
      case "int-list": {
        if (f.rule) { // sorted, unique
          const s = new Set<number>(); while (s.size < n) s.add(int(-30, 30));
          return { kind: "value", value: [...s].sort((a, b) => a - b) };
        }
        return { kind: "value", value: Array.from({ length: n }, () => int(-10, 20)) };
      }
      case "linked-list": return { kind: "linked_list", values: Array.from({ length: n }, () => int(0, 99)) };
      case "string": {
        const alphabet = f.rule ? "()[]{}" : "abcab cd";
        // Bracket strings: half the time, a valid one, so the "everything matched" path runs too.
        if (f.rule && r() < 0.5) {
          let s = ""; const open: string[] = [];
          while (s.length + open.length < n) {
            if (open.length && r() < 0.5) s += { "(": ")", "[": "]", "{": "}" }[open.pop()!];
            else { const c = "([{"[int(0, 2)]; open.push(c); s += c; }
          }
          return { kind: "value", value: s + open.reverse().map((c) => ({ "(": ")", "[": "]", "{": "}" })[c]).join("") };
        }
        return { kind: "value", value: Array.from({ length: n }, () => alphabet[int(0, alphabet.length - 1)]).join("") };
      }
      case "tree": {
        const values: (number | null)[] = [];
        let slots = 1, nodes = 0;
        while (slots > 0 && nodes < n) {
          const isNode = values.length === 0 || r() < 0.7;
          values.push(isNode ? int(1, 99) : null);
          slots--; if (isNode) { slots += 2; nodes++; }
        }
        while (values.length && values.at(-1) === null) values.pop();
        return { kind: "tree", values };
      }
    }
  });
}

describe("every approach works on generated inputs", () => {
  for (const p of PROBLEMS) {
    it(`${p.title}: 8 random valid inputs trace, narrate and draw on every step`, () => {
      const r = rng(p.slug.length * 7919);
      for (let k = 0; k < 8; k++) {
        const args = generate(p, r);
        // Generated inputs must themselves pass the input rules.
        expect(parseInputs(p.inputs, p.inputs.map((f, i) => toText(f, args[i]))).ok, JSON.stringify(args)).toBe(true);
        for (const a of p.approaches) {
          const source = fixtureSource(a.solution);
          const trace = traceCPython({ source, entry: a.entry, args, maxSteps: 4000 });
          expect(trace.ok && !trace.truncated, `${a.name} on ${JSON.stringify(args)}`).toBe(true);
          expect(validateSpec(a.spec, source, [trace], { requireViews: false }), `${a.name} on ${JSON.stringify(args)}`).toEqual([]);
          const prepared = prepare(trace, a.spec);
          for (let i = 0; i < prepared.moments.length; i++) prepared.view(i);
        }
      }
    }, 30_000);
  }
});
