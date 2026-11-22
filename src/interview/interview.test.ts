import { describe, expect, it } from "vitest";
import { fixtureSource, traceCPython } from "../../engine/testing/trace";
import type { TraceRequest } from "../../engine/tracer/types";
import sources from "../curriculum/sources.json";
import { conceptById } from "../knowledge/concepts";
import type { Evidence } from "../knowledge/evidence";
import { assess } from "../knowledge/model";
import { dimensionsOf } from "../knowledge/dimensions";
import { buildCases, checkSolution, measureGrowth, type CaseResult, type Growth } from "../solve/check";
import { gradeApproach, gradeClarify, gradeComplexity, gradeFollowUp, gradeImplement, hiddenWork, nextInterview, passed, readiness, type Report, type Stage } from "./grade";
import { INTERVIEWS, TIMES } from "./problems";

const run = async (r: TraceRequest) => traceCPython(r);
const p = (slug: string) => INTERVIEWS.find((x) => x.slug === slug)!;
const ok = (n: number): CaseResult[] => Array.from({ length: n }, () => ({ args: [], label: "", kind: "example", expected: 1, got: 1, pass: true }));
const growth = (cls: Growth["cls"], target: Growth["cls"]): Growth => ({ cls, target, sizes: [], steps: [] });

describe("interview problems", () => {
  it("come from the curriculum's source lists, with real concepts and complete content", () => {
    const slugs = new Set(sources.problems.map((x) => x.slug));
    for (const q of INTERVIEWS) {
      expect(slugs.has(q.slug), q.slug).toBe(true);
      expect(q.url).toBe(`https://leetcode.com/problems/${q.slug}/`);
      for (const c of q.concepts) expect(conceptById.has(c), `${q.slug}: ${c}`).toBe(true);
      expect(q.clarify.filter((c) => c.matters).length).toBeGreaterThanOrEqual(2);
      expect(q.clarify.some((c) => !c.matters)).toBe(true);
      expect(q.approaches.some((a) => a.best && a.works)).toBe(true);
      expect(q.approaches.some((a) => !a.works)).toBe(true);
      for (const a of q.approaches) expect(TIMES).toContain(a.time);
      expect(q.followUp.choices.filter((c) => c.correct)).toHaveLength(1);
    }
  });

  it("each reference solution passes every case, and measures the growth it claims", async () => {
    for (const q of INTERVIEWS) {
      const ref = fixtureSource(q.solution);
      const cases = await buildCases(q, run);
      expect(cases.length, q.slug).toBeGreaterThanOrEqual(4);
      const results = await checkSolution(q, ref, ref, run, cases);
      expect(results.every((r) => r.pass), q.slug).toBe(true);
      const g = await measureGrowth(q, ref, run);
      expect(g?.cls, q.slug).toBe(q.growth!.target);
      expect(hiddenWork(q, g), q.slug).toBe(false);
    }
  }, 120_000);

  it("catches a wrong solution and a slow one", async () => {
    const q = p("contains-duplicate");
    const wrong = "def contains_duplicate(nums):\n    return False\n";
    const slow = "def contains_duplicate(nums):\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            if nums[i] == nums[j]:\n                return True\n    return False\n";
    const cases = await buildCases(q, run);
    const ref = fixtureSource(q.solution);
    expect((await checkSolution(q, wrong, ref, run, cases)).some((r) => !r.pass)).toBe(true);
    const r = await checkSolution(q, slow, ref, run, cases);
    expect(r.every((x) => x.pass)).toBe(true);
    const g = await measureGrowth(q, slow, run);
    expect(gradeImplement(q, r, g, 0).level).toBe("partial");
  }, 60_000);

  it("sees through work hidden in one line: set() measures O(1), so the chosen approach decides", async () => {
    const q = p("contains-duplicate");
    const oneLine = "def contains_duplicate(nums):\n    return len(set(nums)) != len(nums)\n";
    const cases = await buildCases(q, run);
    const r = await checkSolution(q, oneLine, fixtureSource(q.solution), run, cases);
    const g = await measureGrowth(q, oneLine, run);
    expect(g?.cls).toBe("1");
    expect(hiddenWork(q, g)).toBe(true);
    const setApproach = q.approaches.findIndex((a) => a.best);
    expect(gradeImplement(q, r, g, setApproach).level).toBe("pass");
    const impl = gradeImplement(q, r, g, setApproach);
    expect(gradeComplexity(q, "n", g, impl, setApproach).level).toBe("pass");
    expect(gradeComplexity(q, "1", g, impl, setApproach).level).toBe("miss");
  }, 60_000);
});

describe("grading", () => {
  const q = p("contains-duplicate");
  const best = q.approaches.findIndex((a) => a.best);
  const slowOk = q.approaches.findIndex((a) => a.works && !a.best);
  const broken = q.approaches.findIndex((a) => !a.works);

  it("clarify: all that matter and at most one that doesn't passes", () => {
    const matters = q.clarify.map((c, i) => (c.matters ? i : -1)).filter((i) => i >= 0);
    const extra = q.clarify.findIndex((c) => !c.matters);
    expect(gradeClarify(q, [...matters, extra]).level).toBe("pass");
    expect(gradeClarify(q, [matters[0]]).level).toBe("partial");
    expect(gradeClarify(q, [extra]).level).toBe("miss");
  });

  it("approach: optimal with the right cost passes; working but slower is partial; broken misses", () => {
    expect(gradeApproach(q, best, "n").level).toBe("pass");
    expect(gradeApproach(q, best, "n²").level).toBe("partial");
    expect(gradeApproach(q, slowOk, q.approaches[slowOk].time).level).toBe("partial");
    expect(gradeApproach(q, broken, "n").level).toBe("miss");
  });

  it("implement: failing tests miss, slow is partial, fast passes", () => {
    expect(gradeImplement(q, null, null, best).level).toBe("miss");
    expect(gradeImplement(q, [...ok(3), { ...ok(1)[0], pass: false }], null, best).level).toBe("miss");
    expect(gradeImplement(q, ok(4), growth("n²", "n"), best).level).toBe("partial");
    expect(gradeImplement(q, ok(4), growth("n", "n"), best).level).toBe("pass");
    expect(gradeImplement(q, ok(4), null, best).level).toBe("partial");
  });

  it("complexity: judged against the code's own measurement when there is one", () => {
    const impl = gradeImplement(q, ok(4), growth("n²", "n"), best);
    expect(gradeComplexity(q, "n²", growth("n²", "n"), impl, best).level).toBe("pass");
    expect(gradeComplexity(q, "n", growth("n²", "n"), impl, best).level).toBe("miss");
    const none = gradeImplement(q, null, null, best);
    expect(gradeComplexity(q, "n", null, none, best).level).toBe("partial");
  });

  it("follow-up, and the overall verdict", () => {
    const right = q.followUp.choices.findIndex((c) => c.correct);
    expect(gradeFollowUp(q, right).level).toBe("pass");
    expect(gradeFollowUp(q, (right + 1) % q.followUp.choices.length).level).toBe("miss");
    const all = (level: "pass" | "partial" | "miss") => ({ level, why: "" });
    const stages = { clarify: all("partial"), approach: all("pass"), implement: all("pass"), complexity: all("pass"), "follow-up": all("partial") } as Record<Stage, { level: "pass" | "partial" | "miss"; why: string }>;
    expect(passed(stages)).toBe(true);
    expect(passed({ ...stages, implement: all("partial") })).toBe(false);
    expect(passed({ ...stages, clarify: all("miss") })).toBe(false);
  });
});

describe("choosing interviews, and readiness", () => {
  const report = (slug: string, ok: boolean, at = 0): Report => ({ slug, at, passed: ok, stages: {} as Report["stages"] });

  it("picks an unseen problem the roadmap has reached, never one already met", () => {
    expect(nextInterview([], [], 1)?.slug).toBe("contains-duplicate");
    expect(nextInterview([], [], 13)?.slug).toBe("climbing-stairs");
    const met: Evidence[] = [{ at: 0, task: "exposure", problem: "contains-duplicate", concepts: [], detail: "" }];
    expect(nextInterview(met, [], 1)?.slug).not.toBe("contains-duplicate");
    expect(nextInterview([], INTERVIEWS.map((q) => report(q.slug, true)), 16)).toBeNull();
  });

  it("readiness counts passes among the last five", () => {
    const rs = [true, false, true, true, false, false].map((ok, i) => report(`x${i}`, ok, i));
    expect(readiness(rs)).toEqual({ passed: 2, of: 5 });
    expect(readiness([])).toEqual({ passed: 0, of: 0 });
  });

  it("interview evidence feeds its stage's dimension, and counts as transfer", () => {
    const e = (stage: Evidence["stage"], problem: string, at: number): Evidence => ({ at, task: "interview", stage, problem, concepts: ["hash-set"], correct: true, detail: "" });
    const s = assess([e("implement", "contains-duplicate", 0), e("approach", "contains-duplicate", 1), e("complexity", "a-lesson", 2)], 3).get("hash-set")!;
    const d = Object.fromEntries(dimensionsOf(s).map((x) => [x.dimension, x.level]));
    expect(d.implementation).toBe("emerging");
    expect(d.recognition).toBe("emerging");
    expect(d.explanation).toBe("emerging");
    expect(d.transfer).toBe("solid");
  });
});
