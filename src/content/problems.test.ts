// Every problem in the library must trace cleanly on its example and pass spec validation:
// the same checks the build runs, so a broken lesson fails the tests too.
import { describe, expect, it } from "vitest";
import { validateSpec } from "../../engine/interpreter/validate";
import { prepare } from "../../engine/interpreter/viewmodel";
import { fixtureSource, traceCPython } from "../../engine/testing/trace";
import { PROBLEMS } from "./problems";

describe("problem library", () => {
  it("has unique slugs and approach ids", () => {
    expect(new Set(PROBLEMS.map((p) => p.slug)).size).toBe(PROBLEMS.length);
    for (const p of PROBLEMS) expect(new Set(p.approaches.map((a) => a.id)).size).toBe(p.approaches.length);
  });

  for (const problem of PROBLEMS) {
    for (const approach of problem.approaches) {
      it(`${problem.title} / ${approach.name}: traces, validates, and renders every moment`, () => {
        const source = fixtureSource(approach.solution);
        const trace = traceCPython({ source, entry: approach.entry, args: problem.example });
        expect(trace.ok).toBe(true);
        expect(validateSpec(approach.spec, source, [trace])).toEqual([]);
        const p = prepare(trace, approach.spec);
        for (let i = 0; i < p.moments.length; i++) expect(() => p.view(i)).not.toThrow();
        expect(p.view(p.moments.length - 1).final).toBe(true);
      });
    }
  }

  it("Two Sum's example makes brute force do visibly more work than the hash map", () => {
    const two = PROBLEMS.find((p) => p.slug === "two-sum")!;
    const steps = two.approaches.map((a) => traceCPython({ source: fixtureSource(a.solution), entry: a.entry, args: two.example }).steps.length);
    expect(steps[0]).toBeGreaterThan(steps[1]);
  });
});
