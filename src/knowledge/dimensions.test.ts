import { describe, expect, it } from "vitest";
import { dimensionsOf, type Dimension, type DimensionLevel } from "./dimensions";
import type { Evidence } from "./evidence";
import { assess } from "./model";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ev = (over: Partial<Evidence>): Evidence => ({ at: 0, task: "predict", problem: "two-sum", concepts: ["hash-map"], detail: "x", ...over });

function levels(log: Evidence[], now = 10 * DAY): Record<Dimension, DimensionLevel> {
  const state = assess(log, now).get("hash-map")!;
  return Object.fromEntries(dimensionsOf(state).map((d) => [d.dimension, d.level])) as Record<Dimension, DimensionLevel>;
}

describe("mastery dimensions", () => {
  it("start at none, in a fixed order, each with a reason", () => {
    const state = assess([]).get("hash-map")!;
    const dims = dimensionsOf(state);
    expect(dims.map((d) => d.dimension)).toEqual(["exposure", "recognition", "explanation", "implementation", "transfer", "retention"]);
    for (const d of dims) { expect(d.level).toBe("none"); expect(d.why.length).toBeGreaterThan(0); }
  });

  it("watching is exposure only", () => {
    const l = levels([ev({ task: "exposure" })]);
    expect(l.exposure).toBe("solid");
    expect(l.explanation).toBe("none");
    expect(l.transfer).toBe("none");
  });

  it("each task feeds its own dimension", () => {
    expect(levels([ev({ task: "recall", correct: true })]).recognition).toBe("emerging");
    expect(levels([ev({ task: "complexity", correct: true })]).explanation).toBe("emerging");
    expect(levels([ev({ task: "implement", correct: true })]).implementation).toBe("emerging");
    expect(levels([ev({ task: "recall", correct: true })]).implementation).toBe("none");
  });

  it("solid needs two right answers from different questions", () => {
    const same = [ev({ at: 2, correct: true }), ev({ at: 1, correct: true })];
    expect(levels(same).explanation).toBe("emerging");
    const different = [ev({ at: 2, task: "complexity", correct: true }), ev({ at: 1, correct: true })];
    expect(levels(different).explanation).toBe("solid");
  });

  it("hinted answers never count", () => {
    const l = levels([ev({ at: 2, task: "complexity", correct: true, hinted: true }), ev({ at: 1, correct: true, hinted: true })]);
    expect(l.explanation).toBe("none");
    expect(l.exposure).toBe("solid");
  });

  it("a wrong answer after a right one is slipping; coming back takes two in a row", () => {
    const base = [ev({ at: 1, correct: true }), ev({ at: 2, task: "complexity", correct: true })];
    expect(levels([...base, ev({ at: 3, correct: false })]).explanation).toBe("slipping");
    expect(levels([...base, ev({ at: 3, correct: false }), ev({ at: 4, correct: true })]).explanation).toBe("emerging");
    expect(levels([...base, ev({ at: 3, correct: false }), ev({ at: 4, correct: true }), ev({ at: 5, task: "reason", correct: true })]).explanation).toBe("solid");
  });

  it("a miss before anything was solid isn't slipping", () => {
    const l = levels([ev({ at: 1, correct: true }), ev({ at: 2, task: "complexity", correct: true }), ev({ at: 3, task: "implement", correct: false })]);
    expect(l.explanation).toBe("solid");
    expect(l.implementation).toBe("none");
    expect(l.transfer).toBe("emerging");
    expect(levels([ev({ at: 1, correct: true }), ev({ at: 2, correct: false })]).explanation).toBe("emerging");
  });

  it("transfer needs right answers in two different problems", () => {
    expect(levels([ev({ at: 1, correct: true }), ev({ at: 2, task: "complexity", correct: true })]).transfer).toBe("emerging");
    expect(levels([ev({ at: 1, correct: true }), ev({ at: 2, problem: "contains-duplicate", correct: true })]).transfer).toBe("solid");
  });

  it("retention needs sessions at least 8 hours apart, and slips when a review is overdue", () => {
    expect(levels([ev({ at: 0, correct: true }), ev({ at: HOUR, task: "recall", correct: true })]).retention).toBe("emerging");
    const kept = [ev({ at: 0, correct: true }), ev({ at: 9 * HOUR, task: "recall", correct: true })];
    expect(levels(kept, 9 * HOUR + 1).retention).toBe("solid");
    expect(levels(kept, 30 * DAY).retention).toBe("slipping");
  });

  it("never disagrees with the overall state: an understood concept has transfer or retention solid", () => {
    const logs = [
      [ev({ at: 0, correct: true }), ev({ at: 9 * HOUR, task: "recall", correct: true })],
      [ev({ at: 0, correct: true }), ev({ at: 1, problem: "contains-duplicate", task: "recall", correct: true })],
    ];
    for (const log of logs) {
      const state = assess(log, 9 * HOUR + 2).get("hash-map")!;
      expect(state.state).toBe("understood");
      const l = Object.fromEntries(dimensionsOf(state).map((d) => [d.dimension, d.level]));
      expect([l.transfer, l.retention]).toContain("solid");
    }
  });
});
