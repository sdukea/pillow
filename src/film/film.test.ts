import { describe, expect, it } from "vitest";
import { PROBLEMS } from "../content/problems";
import { matchProblems } from "../lib/match";
import { BEAT, buildFilm, firstSentence, runPacing } from "./film";

describe("films", () => {
  for (const p of PROBLEMS.filter((x) => x.lesson)) {
    it(`${p.title}: question → obvious idea → its run → waste → insight → better run → remember`, () => {
      const film = buildFilm(p);
      expect(film.scenes.map((s) => s.id)).toEqual(["question", "obvious", "run-obvious", "waste", "insight", "run-better", "remember"]);
      const q = film.scenes[0];
      expect(q.kind === "question" && q.picture.views.length).toBeGreaterThan(0);
    });
  }

  it("races on time, or on memory when both approaches take the same time", () => {
    const growth = { sizes: [8, 16], spaceSizes: [8, 16], approaches: { a: { steps: [10, 20], space: [4, 8] }, b: { steps: [9, 18], space: [2, 2] } } };
    const depth = PROBLEMS.find((p) => p.slug === "maximum-depth-of-binary-tree")!;
    const ids = depth.approaches.map((a) => a.id);
    const g = { ...growth, approaches: { [ids[0]]: growth.approaches.a, [ids[1]]: growth.approaches.b } };
    const race = buildFilm(depth, g).scenes.find((s) => s.kind === "race");
    expect(race?.kind === "race" && race.unit).toBe("items held at once");
    const two = PROBLEMS.find((p) => p.slug === "two-sum")!;
    const g2 = { ...growth, approaches: { [two.approaches[0].id]: growth.approaches.a, [two.approaches[1].id]: growth.approaches.b } };
    const race2 = buildFilm(two, g2).scenes.find((s) => s.kind === "race");
    expect(race2?.kind === "race" && race2.unit).toBe("steps");
  });

  it("fast-forwards a long run's middle, so any run fits in a film, and shows every step", () => {
    expect(runPacing(8)).toEqual(Array(8).fill(BEAT));
    const long = runPacing(400);
    expect(long).toHaveLength(400);
    expect(long.slice(0, 6).every((x) => x === BEAT)).toBe(true);
    expect(long.slice(-3).every((x) => x === BEAT)).toBe(true);
    expect(long.reduce((a, b) => a + b, 0)).toBeLessThan(9 * BEAT + 6_100 + 400 * 60);
  });

  it("headlines take the first sentence", () => {
    expect(firstSentence("Rescanning. After every deletion…")).toBe("Rescanning.");
    expect(firstSentence("No full stop")).toBe("No full stop");
  });
});

describe("matching what someone typed", () => {
  it("finds problems by link, number or title words", () => {
    expect(matchProblems("https://leetcode.com/problems/two-sum/description/").map((p) => p.slug)).toEqual(["two-sum"]);
    expect(matchProblems("#704").map((p) => p.slug)).toEqual(["binary-search"]);
    expect(matchProblems("valid par")[0].slug).toBe("valid-parentheses");
    expect(matchProblems("depth binary tree")[0].slug).toBe("maximum-depth-of-binary-tree");
    expect(matchProblems("merge intervals")).toEqual([]);
    expect(matchProblems("   ")).toEqual([]);
  });
});
