import { describe, expect, it } from "vitest";
import { dueAt, intervalDays, recallNow, retrievability, review, type Memory, type Rating } from "./fsrs";

const DAY = 86_400_000;

describe("FSRS", () => {
  it("matches the reference implementation (fsrs4anki_scheduler.js @ ff7c85c) step by step", () => {
    // Produced by running the reference's own functions on this sequence, with fuzz off.
    const seq: [Rating, number][] = [[3, 0], [3, 0.2], [3, 3], [1, 10], [2, 1.5], [3, 4], [3, 0.5], [3, 20]];
    const golden = [[2.31, 2.12, 2], [2.31, 2.12, 2], [13.83, 2.12, 14], [1.67, 7.4, 2], [3.32, 8.26, 3], [7.89, 8.25, 8], [7.89, 8.24, 8], [22.9, 8.23, 23]];
    let m: Memory | null = null, at = 0;
    seq.forEach(([rating, days], i) => {
      at += days * DAY;
      m = review(m, rating, at);
      expect([m.stability, m.difficulty, intervalDays(m.stability)], `step ${i}`).toEqual(golden[i]);
    });
  });

  it("recall probability is 90% exactly one stability later, and falls with time", () => {
    expect(retrievability(0, 5)).toBe(1);
    expect(retrievability(5, 5)).toBeCloseTo(0.9, 10);
    expect(retrievability(20, 5)).toBeLessThan(retrievability(10, 5));
  });

  it("schedules the next review when recall would fall to 90%", () => {
    const m = review(null, 3, 0);
    expect(dueAt(m)).toBe(intervalDays(m.stability) * DAY);
    expect(recallNow(m, dueAt(m))).toBeCloseTo(0.9, 1);
  });

  it("a lapse shortens the interval; a later success lengthens it", () => {
    let m = review(review(null, 3, 0), 3, 3 * DAY);
    const before = intervalDays(m.stability);
    m = review(m, 1, 20 * DAY);
    expect(intervalDays(m.stability)).toBeLessThan(before);
    expect(m.lapses).toBe(1);
  });
});
