// Custom input: parsing, limits, and, most importantly, that every approach still traces,
// narrates and draws correctly on inputs nobody wrote a lesson for.
import { describe, expect, it } from "vitest";
import { validateSpec } from "../../engine/interpreter/validate";
import { prepare } from "../../engine/interpreter/viewmodel";
import { fixtureSource, traceCPython } from "../../engine/testing/trace";
import { generateInput, rng } from "./generate";
import { labelOf, parseInputs, toText } from "./inputs";
import { PROBLEMS } from "./problems";

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
describe("every approach works on generated inputs", () => {
  for (const p of PROBLEMS) {
    it(`${p.title}: 8 random valid inputs trace, narrate and draw on every step`, () => {
      const r = rng(p.slug.length * 7919);
      for (let k = 0; k < 8; k++) {
        const args = generateInput(p.inputs, r);
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
