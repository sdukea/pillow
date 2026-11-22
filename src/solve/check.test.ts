import { describe, expect, it } from "vitest";
import { fixtureSource, traceCPython } from "../../engine/testing/trace";
import type { TraceRequest } from "../../engine/tracer/types";
import { PROBLEMS } from "../content/problems";
import { asGoodAs, buildCases as buildCasesFor, checkableOf, checkSolution as checkSolutionFor, measureGrowth as measureGrowthFor, starter as starterFor } from "./check";
import type { Problem } from "../content/problems";

// The checker takes a Checkable; these tests check lessons' problems through checkableOf.
const buildCases = (p: Problem, ...rest: [Parameters<typeof buildCasesFor>[1]]) => buildCasesFor(checkableOf(p), ...rest);
const checkSolution = (p: Problem, ...rest: Parameters<typeof checkSolutionFor> extends [unknown, ...infer R] ? R : never) => checkSolutionFor(checkableOf(p), ...rest);
const measureGrowth = (p: Problem, ...rest: Parameters<typeof measureGrowthFor> extends [unknown, ...infer R] ? R : never) => measureGrowthFor(checkableOf(p), ...rest);
const starter = (p: Problem) => starterFor(checkableOf(p));

const run = async (r: TraceRequest) => traceCPython(r);
const problem = (slug: string) => PROBLEMS.find((p) => p.slug === slug)!;
const reference = (slug: string) => fixtureSource(problem(slug).approaches.at(-1)!.solution);

describe("checking a student's solution", () => {
  it("passes the reference solution on every case, for every problem", async () => {
    for (const p of PROBLEMS.filter((x) => x.lesson)) {
      const cases = await buildCases(p, run);
      expect(cases.length, p.slug).toBeGreaterThanOrEqual(1 + (p.lesson!.edgeCases.length) + 4);
      const results = await checkSolution(p, reference(p.slug), reference(p.slug), run, cases);
      expect(results.filter((r) => !r.pass), p.slug).toEqual([]);
    }
  }, 120_000);

  it("shows what was expected and what came back when a solution is wrong", async () => {
    const p = problem("binary-search");
    const buggy = "def search(nums, target):\n    lo, hi = 0, len(nums) - 1\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if nums[mid] == target:\n            return mid\n        if nums[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1\n";
    const results = await checkSolution(p, buggy, reference(p.slug), run, await buildCases(p, run));
    const fail = results.find((r) => !r.pass)!;
    expect(fail).toBeDefined();
    expect(fail.got).not.toEqual(fail.expected);
    expect(typeof fail.label).toBe("string");
  });

  it("reports syntax errors and crashes with the line, and stops endless loops", async () => {
    const p = problem("valid-parentheses");
    const cases = (await buildCases(p, run)).slice(0, 1);
    const [syntax] = await checkSolution(p, "def is_valid(s):\n    return s ==\n", reference(p.slug), run, cases);
    expect(syntax.error).toMatchObject({ type: "SyntaxError", line: 2 });
    const [crash] = await checkSolution(p, "def is_valid(s):\n    x = []\n    return x[5]\n", reference(p.slug), run, cases);
    expect(crash.error).toMatchObject({ type: "IndexError", line: 3 });
    const [loop] = await checkSolution(p, "def is_valid(s):\n    while True:\n        pass\n", reference(p.slug), run, cases);
    expect(loop.error?.type).toBe("Too slow");
    const [named] = await checkSolution(p, "def valid(s):\n    return True\n", reference(p.slug), run, cases);
    expect(named.error?.message).toBe("Define a function called is_valid");
  });

  it("accepts Two Sum's indices in either order", async () => {
    const p = problem("two-sum");
    const reversed = "def two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [i, seen[target - x]]\n        seen[x] = i\n    return []\n";
    const results = await checkSolution(p, reversed, reference(p.slug), run, await buildCases(p, run));
    expect(results.every((r) => r.pass)).toBe(true);
  });

  it("measures how a correct solution grows: brute force is correct but not as good", async () => {
    const p = problem("two-sum");
    const brute = fixtureSource(p.approaches[0].solution);
    expect((await checkSolution(p, brute, reference(p.slug), run, await buildCases(p, run))).every((r) => r.pass)).toBe(true);
    const slow = (await measureGrowth(p, brute, run))!;
    expect(slow).toMatchObject({ cls: "n²", target: "n" });
    expect(asGoodAs(slow.cls, slow.target)).toBe(false);
    const fast = (await measureGrowth(p, reference(p.slug), run))!;
    expect(fast.cls).toBe("n");
    expect(asGoodAs(fast.cls, fast.target)).toBe(true);
  }, 60_000);

  it("starts from the function signature", () => {
    expect(starter(problem("two-sum"))).toBe("def two_sum(nums, target):\n    ");
  });
});
