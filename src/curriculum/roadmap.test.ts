import { describe, expect, it } from "vitest";
import type { Evidence } from "../knowledge/evidence";
import { assess } from "../knowledge/model";
import { WEEKS } from "./curriculum";
import { currentWeek, nextProblem, placementWeek, progressOf } from "./roadmap";

const DAY = 86_400_000;
const ev = (over: Partial<Evidence>): Evidence => ({ at: 0, task: "predict", problem: "two-sum", concepts: ["hash-map"], detail: "x", ...over });

/** Evidence that makes each concept understood: two clean answers from different tasks, days apart. */
function understand(concepts: string[]): Evidence[] {
  return concepts.flatMap((c) => [
    ev({ at: 0, task: "predict", problem: "a", concepts: [c as never], correct: true }),
    ev({ at: 2 * DAY, task: "recall", problem: "b", concepts: [c as never], correct: true }),
  ]);
}

describe("the roadmap", () => {
  it("starts a new student at week 1, on the first problem with a lesson", () => {
    const states = assess([]);
    expect(currentWeek(states)).toBe(1);
    expect(nextProblem(states, [])?.slug).toBe("two-sum");
  });

  it("moves on once a week's concepts are understood, from evidence alone", () => {
    const log = understand(WEEKS[0].introduces);
    const states = assess(log, 3 * DAY);
    expect(currentWeek(states)).toBe(2);
  });

  it("counts a problem solved only for an unhinted, fast-enough solution", () => {
    expect(progressOf([], "two-sum")).toBe("new");
    expect(progressOf([ev({ task: "exposure" })], "two-sum")).toBe("practised");
    expect(progressOf([ev({ task: "implement", correct: false })], "two-sum")).toBe("practised");
    expect(progressOf([ev({ task: "implement", correct: true, hinted: true })], "two-sum")).toBe("practised");
    expect(progressOf([ev({ task: "implement", correct: true })], "two-sum")).toBe("solved");
  });

  it("skips solved problems", () => {
    const log = [ev({ task: "implement", correct: true })];
    expect(nextProblem(assess(log), log)?.slug).not.toBe("two-sum");
  });

  it("places from the placement check's right answers, and starts the roadmap there", () => {
    const diag = (week: number): Evidence => ev({ task: "diagnostic", problem: "diagnostic", week, facet: "recognition", concepts: ["arrays"], correct: true });
    expect(placementWeek([])).toBe(1);
    const log = [diag(1), diag(2), diag(3)];
    expect(placementWeek(log)).toBe(4);
    expect(currentWeek(assess(log), log)).toBe(4);
    expect(nextProblem(assess(log), log)?.slug).toBe("valid-parentheses");
    // A gap means the check stopped there.
    expect(placementWeek([diag(1), diag(3)])).toBe(2);
  });
});
