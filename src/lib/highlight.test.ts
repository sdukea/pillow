import { describe, expect, it } from "vitest";
import { tokenizeLine } from "./highlight";

const kinds = (line: string) => tokenizeLine(line).filter((t) => t.text.trim()).map((t) => `${t.kind}:${t.text}`);

describe("syntax highlighting", () => {
  it("marks keywords, builtins, function names, numbers, strings and comments", () => {
    expect(kinds("def two_sum(nums, target):")).toEqual(["keyword:def", "def:two_sum", "op:(", "plain:nums", "op:,", "plain:target", "op:)", "op::"]);
    expect(kinds("    for i, x in enumerate(nums):")).toContain("builtin:enumerate");
    expect(kinds("    if x == 'a' and n > 10:  # check")).toEqual(["keyword:if", "plain:x", "op:=", "op:=", "string:'a'", "keyword:and", "plain:n", "op:>", "number:10", "op::", "comment:# check"]);
  });
  it("keeps every character, so the line renders exactly as written", () => {
    const line = '    pairs = {")": "(", "]": "["}  # map';
    expect(tokenizeLine(line).map((t) => t.text).join("")).toBe(line);
  });
});
