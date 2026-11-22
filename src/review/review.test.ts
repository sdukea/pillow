import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PROBLEMS, type Problem } from "../content/problems";
import { CONCEPTS } from "../knowledge/concepts";
import type { Evidence } from "../knowledge/evidence";
import { assess } from "../knowledge/model";
import { conceptQuestion, reconstructQuestion, reviewOptions, reviewQuestion } from "./questions";
import { dueForReview, reviewHistory } from "./queue";

const DAY = 86_400_000;
const sourceOf = (p: Problem) => readFileSync(`engine/tracer/fixtures/${p.approaches.at(-1)!.solution}.py`, "utf8");
const twoSum = PROBLEMS.find((p) => p.slug === "two-sum")!;
const ev = (over: Partial<Evidence>): Evidence => ({ at: 0, task: "predict", problem: "two-sum", concepts: ["hash-map"], detail: "x", correct: true, ...over });

describe("review questions", () => {
  it("concept questions name the concept that fits its own 'use it when', among others of its kind", () => {
    for (const c of CONCEPTS) {
      const q = conceptQuestion(c.id, 3);
      expect(q.choices.filter((x) => x.correct)).toEqual([{ label: c.name, correct: true }]);
      expect(q.prompt).toContain(c.useWhen);
      expect(new Set(q.choices.map((x) => x.label)).size).toBe(q.choices.length);
      for (const x of q.choices) expect(CONCEPTS.find((o) => o.name === x.label)!.kind).toBe(c.kind);
    }
  });

  it("reconstruction asks for the real next line of the real solution", () => {
    const src = sourceOf(twoSum);
    for (let seed = 0; seed < 6; seed++) {
      const q = reconstructQuestion("hash-map", twoSum, src, seed)!;
      const lines = src.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
      const right = q.choices.find((c) => c.correct)!.label;
      expect(lines[q.code!.length].trim()).toBe(right);
      expect(q.code).toEqual(lines.slice(0, q.code!.length));
      expect(q.choices.filter((c) => c.label === right)).toHaveLength(1);
      // No wrong option is a line already on screen.
      const shown = new Set(q.code!.map((l) => l.trim()));
      for (const c of q.choices.filter((x) => !x.correct)) expect(shown.has(c.label), c.label).toBe(false);
    }
  });

  it("offers every kind for a concept with a lesson, and rotates through them review by review", () => {
    const teaching = [twoSum];
    const kinds = reviewOptions("complement", teaching, PROBLEMS, sourceOf, 0).map((q) => q.kind);
    expect(kinds).toEqual(["concept", "pattern", "reconstruct", "complexity"]);
    const asked = [0, 1, 2, 3].map((n) => reviewQuestion("complement", n, teaching, PROBLEMS, sourceOf).kind);
    expect(new Set(asked).size).toBe(4);
    expect(reviewOptions("graphs", [], PROBLEMS, sourceOf, 0).map((q) => q.kind)).toEqual(["concept"]);
  });

  it("every built problem yields valid questions with exactly one right answer", () => {
    for (const p of PROBLEMS) {
      for (const q of reviewOptions("arrays", [p], PROBLEMS, sourceOf, 1)) {
        expect(q.choices.filter((c) => c.correct), `${p.slug} ${q.kind}`).toHaveLength(1);
        expect(q.choices.length).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe("the review queue", () => {
  it("holds due learning and understood concepts, least remembered first, and skips shaky ones", () => {
    const log = [
      ev({ at: 0, concepts: ["hash-map"] }),
      ev({ at: 0, concepts: ["stack"] }), ev({ at: 5 * DAY, concepts: ["stack"], task: "recall" }),
      ev({ at: 0, concepts: ["queue"], correct: false }),
    ];
    const due = dueForReview(assess(log, 60 * DAY));
    expect(due.map((s) => s.id)).toEqual(["hash-map", "stack"]);
    expect(dueForReview(assess(log, 1))).toEqual([]);
  });

  it("keeps a history of review answers only", () => {
    const log = [ev({ at: 1 }), ev({ at: 2, review: true }), ev({ at: 3, review: true, correct: false })];
    expect(reviewHistory(log).map((e) => e.at)).toEqual([3, 2]);
  });

  it("concept-only review answers never count as using it in another problem", () => {
    const log = [ev({ at: 0 }), ev({ at: 1, problem: "review", task: "recall" })];
    expect(assess(log, 2).get("hash-map")!.state).toBe("learning");
  });
});
