import { describe, expect, it } from "vitest";
import { matchProblems } from "./match";

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
