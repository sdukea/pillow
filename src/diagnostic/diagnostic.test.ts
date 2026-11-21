import { describe, expect, it } from "vitest";
import { conceptById } from "../knowledge/concepts";
import { introWeek, WEEKS } from "../curriculum/weeks";
import { DIAGNOSTIC } from "./questions";
import { progress, type Answer, type Outcome } from "./flow";

/** Answer the check by a script of outcomes, returning the answers given. */
function run(script: Outcome[]): Answer[] {
  const answers: Answer[] = [];
  for (const outcome of script) {
    const { next } = progress(answers);
    if (!next) break;
    answers.push({ id: next.id, outcome });
  }
  return answers;
}

describe("the placement questions", () => {
  it("cover every teaching week with one recognition and one explanation question", () => {
    for (const w of WEEKS.filter((w) => w.introduces.length)) {
      const qs = DIAGNOSTIC.filter((q) => q.week === w.week);
      expect(qs.map((q) => q.facet).sort(), `week ${w.week}`).toEqual(["explanation", "recognition"]);
    }
    expect(new Set(DIAGNOSTIC.map((q) => q.id)).size).toBe(DIAGNOSTIC.length);
  });

  it("test only concepts taught by their week", () => {
    for (const q of DIAGNOSTIC) {
      expect(q.concepts.length).toBeGreaterThan(0);
      for (const c of q.concepts) {
        expect(conceptById.has(c), `${q.id}: ${c}`).toBe(true);
        expect(introWeek.get(c)!, `${q.id}: ${c}`).toBeLessThanOrEqual(q.week);
      }
    }
  });

  it("have four distinct choices and an explanation", () => {
    for (const q of DIAGNOSTIC) {
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.explain.length).toBeGreaterThan(20);
    }
  });
});

describe("the placement flow", () => {
  it("starts at week 1 with a recognition question", () => {
    const p = progress([]);
    expect(p.next?.id).toBe("w1-r");
    expect(p.placed).toBe(1);
  });

  it("a beginner who hasn't learned it yet stops at once, at week 1", () => {
    const answers = run(["skip"]);
    expect(answers).toHaveLength(1);
    expect(progress(answers)).toMatchObject({ next: null, placed: 1, passed: [] });
  });

  it("a wrong answer gets one second chance from the explanation question", () => {
    const p = progress([{ id: "w1-r", outcome: "wrong" }]);
    expect(p.next?.id).toBe("w1-e");
    expect(progress([{ id: "w1-r", outcome: "wrong" }, { id: "w1-e", outcome: "right" }]).next?.id).toBe("w2-r");
  });

  it("two misses in a week stop there", () => {
    const answers = run(["right", "right", "wrong", "wrong"]);
    expect(progress(answers)).toMatchObject({ next: null, placed: 3, passed: [1, 2] });
  });

  it("passing everything places at the review week, in at most two questions a week", () => {
    const answers = run(Array(40).fill("right"));
    expect(answers).toHaveLength(15);
    expect(progress(answers)).toMatchObject({ next: null, placed: 16 });
  });
});
