import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { traceFixture, value } from "../testing/trace";
import type { Arg } from "../tracer/types";
import { evaluate, ExprError, parse } from "./expr";
import * as specs from "./fixtures/specs";
import { buildMoments } from "./moments";
import { render } from "./narrate";
import { initialPlayback, playback, type PlaybackState } from "./playback";
import type { VizSpec } from "./spec";
import { validateSpec } from "./validate";
import { prepare, type ViewModel } from "./viewmodel";

const twoSum = () => traceFixture("two_sum_hash", "two_sum", [value([2, 7, 11, 15]), value(9)]);
const reverse = () => traceFixture("reverse_list", "reverse_list", [{ kind: "linked_list", values: [1, 2, 3] }]);
const depth = () => traceFixture("max_depth", "max_depth", [{ kind: "tree", values: [3, 9, 20, null, null, 15, 7] }]);
const source = (fixture: string) => readFileSync(join(import.meta.dirname, "..", "tracer", "fixtures", `${fixture}.py`), "utf8");
const view = <K extends ViewModel["kind"]>(views: ViewModel[], id: string) => views.find((v) => v.id === id) as Extract<ViewModel, { kind: K }>;

// ------------------------------------------------------------------ expressions
describe("expression language", () => {
  const heap = { "1": { type: "list", items: [2, 7, 11] }, "2": { type: "dict", entries: [[2, 0], ["a", 5]] as [unknown, unknown][] }, "3": { type: "ListNode", fields: { val: 4, next: null } } } as never;
  const scope = { locals: { nums: { ref: 1 }, seen: { ref: 2 }, node: { ref: 3 }, i: 1, s: "abc", ch: "a" }, heap };

  it("reads variables, indexes, attributes and arithmetic like Python", () => {
    expect(evaluate("nums[i]", scope)).toBe(7);
    expect(evaluate("nums[-1]", scope)).toBe(11);
    expect(evaluate("seen[2]", scope)).toBe(0);
    expect(evaluate("seen[ch]", scope)).toBe(5);
    expect(evaluate("node.val", scope)).toBe(4);
    expect(evaluate("9 - nums[0]", scope)).toBe(7);
    expect(evaluate("7 // 2", scope)).toBe(3);
    expect(evaluate("-7 % 3", scope)).toBe(2); // Python's modulo, not JavaScript's
    expect(evaluate("s[1]", scope)).toBe("b");
    expect(evaluate("len(nums) + len(s)", scope)).toBe(6);
    expect(evaluate("max(i, 5) - min(3, i)", scope)).toBe(4);
  });

  it("supports conditions: in, not in, comparisons, and/or/not", () => {
    expect(evaluate("2 in seen", scope)).toBe(true);
    expect(evaluate("7 in seen", scope)).toBe(false);
    expect(evaluate("7 not in seen", scope)).toBe(true);
    expect(evaluate("11 in nums and i < 2", scope)).toBe(true);
    expect(evaluate("not 7 in seen", scope)).toBe(true);
    expect(evaluate("node.next == None", scope)).toBe(true);
    expect(evaluate("'b' in s", scope)).toBe(true);
  });

  it("explains its errors instead of guessing", () => {
    expect(() => evaluate("missing + 1", scope)).toThrow(ExprError);
    expect(() => evaluate("nums[9]", scope)).toThrow(/out of range/);
    expect(() => evaluate("seen[99]", scope)).toThrow(/isn't in the dict/);
    expect(() => parse("nums[")).toThrow(ExprError);
    expect(() => parse("eval(x)")).toThrow(/Unknown function/);
    expect(() => parse("__import__('os')")).toThrow(ExprError);
  });

  it("renders narration templates with Python-style values", () => {
    expect(render("{nums} has {len(nums)} items; seen = {seen}; {{literal}}", scope)).toBe("[2, 7, 11] has 3 items; seen = {2: 0, 'a': 5}; {literal}");
    expect(render("'{ch}' then {s[2]}", scope)).toBe("'a' then c");
  });
});

// ------------------------------------------------------------------ moments: hand-checked
describe("moments (hand-checked against Two Sum on [2, 7, 11, 15], 9)", () => {
  const moments = buildMoments(twoSum());

  it("starts with the body about to run and folds the def line away", () => {
    expect(moments[0].executed).toBeUndefined();
    expect(moments[1].executed?.line).toBe(2);
  });

  it("records exactly what each line changed", () => {
    const lines = moments.slice(1).map((m) => m.executed!.line);
    expect(lines).toEqual([2, 3, 4, 5, 7, 3, 4, 5, 6]);
    expect(moments[1].changes).toEqual([{ kind: "assign", name: "seen", value: { ref: expect.any(Number) } }]);
    expect(moments[2].changes).toEqual([{ kind: "assign", name: "i", value: 0 }, { kind: "assign", name: "x", value: 2 }]);
    expect(moments[3].changes).toEqual([{ kind: "assign", name: "need", value: 7 }]);
    expect(moments[4].changes).toEqual([]); // `if need in seen` only looks
    expect(moments[5].changes).toEqual([{ kind: "dict-set", ref: expect.any(Number), key: 2, to: 0 }]);
    expect(moments[6].changes).toEqual([{ kind: "rebind", name: "i", from: 0, to: 1 }, { kind: "rebind", name: "x", from: 2, to: 7 }]);
    expect(moments[7].changes).toEqual([{ kind: "rebind", name: "need", from: 7, to: 2 }]);
    expect(moments.at(-1)!.changes).toContainEqual({ kind: "return", fn: "two_sum", depth: 1, value: { ref: expect.any(Number) } });
    expect(moments.at(-1)!.final).toBe(true);
  });
});

describe("moments on pointers and recursion", () => {
  it("records each next pointer being rewired (Reverse Linked List)", () => {
    const fields = buildMoments(reverse()).flatMap((m) => m.changes.filter((c) => c.kind === "field"));
    expect(fields).toHaveLength(3); // one rewire per node
    expect(fields.every((c) => c.kind === "field" && c.field === "next")).toBe(true);
  });

  it("credits a finished call's assignment to the caller's line (Maximum Depth)", () => {
    const moments = buildMoments(depth());
    // The first time `left = max_depth(root.left)` completes at the top level, `left` appears.
    const done = moments.find((m) => m.executed?.line === 4 && m.depth === 1 && m.changes.some((c) => c.kind === "assign" && c.name === "left"));
    expect(done).toBeDefined();
    expect(done!.changes).toContainEqual({ kind: "assign", name: "left", value: 1 });
    // Calls appear as one moment each, never as a separate def-line moment.
    expect(moments.filter((m) => m.executed?.line === 1)).toHaveLength(0);
    expect(moments.filter((m) => m.changes.some((c) => c.kind === "call"))).toHaveLength(10); // each of the 5 nodes calls twice
  });

  it("records pushes and pops on a stack (Valid Parentheses)", () => {
    const t = traceFixture("valid_parentheses", "is_valid", [value("([])")]);
    const ops = buildMoments(t).flatMap((m) => m.changes.filter((c) => c.kind === "push" || c.kind === "pop").map((c) => `${c.kind} ${(c as { value: unknown }).value}`));
    expect(ops).toEqual(["push (", "push [", "pop [", "pop ("]);
  });
});

// ------------------------------------------------------------------ view models
describe("view models", () => {
  it("Two Sum: the map fills in, the lookup is focused, and narration uses the real values", () => {
    const p = prepare(twoSum(), specs.twoSumHash);
    const stored = p.view(5);
    expect(stored.ranLine).toBe(7);
    expect(view<"map">(stored.views, "seen").entries).toEqual([{ key: "2", value: "0", state: "added", focused: false }]);
    expect(stored.narration).toBe("Remember 2 at index 0, in case a later number needs it.");
    expect(stored.changes).toEqual(["seen[2] = 0"]);

    const lookup = p.view(8); // `if need in seen` with need = 2
    expect(lookup.ranLine).toBe(5);
    expect(view<"map">(lookup.views, "seen").entries[0].focused).toBe(true);
    expect(lookup.narration).toBe("2 is in the map: we saw it at index 0. That's the pair.");
    expect(view<"array">(lookup.views, "nums").pointers).toEqual([{ name: "i", index: 1, moved: false }]);

    const end = p.view(p.moments.length - 1);
    expect(end.final).toBe(true);
    expect(end.returned).toBe("[0, 1]");
    expect(end.nextLine).toBeUndefined();
  });

  it("Longest Substring: the window is drawn from left to right and moves when a letter repeats", () => {
    const p = prepare(traceFixture("longest_substring", "length_of_longest_substring", [value("abca")]), specs.longestSubstring);
    const shrink = p.moments.findIndex((m) => m.executed?.line === 7);
    const v = p.view(shrink);
    expect(v.narration).toBe("Move left past the earlier 'a', to 1.");
    const arr = view<"array">(v.views, "s");
    expect(arr.cells.map((c) => c.text)).toEqual(["a", "b", "c", "a"]);
    expect(arr.range).toEqual({ from: 1, to: 3, label: "window" });
    expect(arr.pointers.find((x) => x.name === "left")).toEqual({ name: "left", index: 1, moved: true });
  });

  it("Binary Search: lo, mid and hi are pointers and the possible range shrinks", () => {
    const p = prepare(traceFixture("binary_search", "search", [value([1, 3, 5, 7, 9, 11, 13]), value(11)]), specs.binarySearch);
    const ranges = p.moments.map((_, i) => view<"array">(p.view(i).views, "nums").range).filter(Boolean).map((r) => `${r!.from}-${r!.to}`);
    expect([...new Set(ranges)]).toEqual(["0-6", "4-6"]);
    expect(p.view(p.moments.length - 1).returned).toBe("5");
  });

  it("Reverse Linked List: nodes stay put while next pointers flip, and names follow the nodes", () => {
    const p = prepare(reverse(), specs.reverseList);
    const first = view<"linked-list">(p.view(0).views, "list");
    expect(first.nodes.map((n) => [n.text, n.next])).toEqual([["1", 2], ["2", 3], ["3", null]]);
    const end = view<"linked-list">(p.view(p.moments.length - 1).views, "list");
    expect(end.nodes.map((n) => n.id)).toEqual(first.nodes.map((n) => n.id)); // same order, no jumping
    expect(end.nodes.map((n) => [n.text, n.next])).toEqual([["1", null], ["2", 1], ["3", 2]]);
    const rewire = p.moments.findIndex((m) => m.executed?.line === 6 && m.changes.some((c) => c.kind === "field"));
    const r = p.view(rewire);
    expect(view<"linked-list">(r.views, "list").nodes[0].nextChanged).toBe(true);
    expect(r.narration).toBe("Point 1 back at nothing. It becomes the new tail.");
    expect(view<"linked-list">(r.views, "list").nodes[0].pointers).toEqual(["cur"]);
  });

  it("Maximum Depth: a fixed tree layout, the active node, and depths filled in as calls return", () => {
    const p = prepare(depth(), specs.maxDepth);
    const tree0 = view<"tree">(p.view(0).views, "tree");
    // In-order x, depth y: 9 · 3 · 15 · 20 · 7 from left to right.
    const pos = Object.fromEntries(tree0.nodes.map((n) => [n.text, [n.x, n.y]]));
    expect(pos).toEqual({ "9": [0, 1], "3": [1, 0], "15": [2, 2], "20": [3, 1], "7": [4, 2] });
    expect(tree0.edges).toHaveLength(4);
    expect(tree0.nodes.find((n) => n.current)?.text).toBe("3");
    const end = view<"tree">(p.view(p.moments.length - 1).views, "tree");
    expect(Object.fromEntries(end.nodes.map((n) => [n.text, n.returned]))).toEqual({ "3": "3", "9": "1", "20": "2", "15": "1", "7": "1" });
    // While inside the call for 15, the stack holds 3 → 20 → 15.
    const inside15 = p.moments.findIndex((_, i) => view<"tree">(p.view(i).views, "tree").nodes.find((n) => n.current)?.text === "15");
    const stack = view<"call-stack">(p.view(inside15).views, "calls").frames.map((f) => f.detail);
    expect(stack).toEqual(["root.val = 3", "root.val = 20", "root.val = 15"]);
    expect(p.view(p.moments.length - 1).narration).toBe("So 3 is 1 + max(1, 2) = 3 deep.");
  });
});

// ------------------------------------------------------------------ playback
describe("playback", () => {
  const depths = [1, 1, 2, 2, 3, 3, 2, 2, 1, 1].map((depth) => ({ depth }));
  const run = (actions: Parameters<typeof playback>[1][], from: PlaybackState = initialPlayback()) => actions.reduce((s, a) => playback(s, a, depths), from);

  it("steps forward and back within bounds", () => {
    expect(run([{ type: "prev" }]).index).toBe(0);
    expect(run([{ type: "next" }, { type: "next" }, { type: "prev" }]).index).toBe(1);
    expect(run([{ type: "end" }, { type: "next" }]).index).toBe(9);
    expect(run([{ type: "goto", index: 99 }]).index).toBe(9);
    expect(run([{ type: "goto", index: 5 }, { type: "restart" }]).index).toBe(0);
  });

  it("plays by ticking, stops at the end, and restarts if played from the end", () => {
    let s = run([{ type: "play" }]);
    for (let i = 0; i < 20; i++) s = playback(s, { type: "tick" }, depths);
    expect(s).toMatchObject({ index: 9, playing: false });
    expect(playback(s, { type: "play" }, depths)).toMatchObject({ index: 0, playing: true });
    expect(run([{ type: "toggle" }, { type: "toggle" }]).playing).toBe(false);
    expect(run([{ type: "play" }, { type: "next" }]).playing).toBe(false); // manual stepping pauses
  });

  it("steps over a call's insides and out of the current call", () => {
    const at1 = run([{ type: "goto", index: 1 }]);
    expect(playback(at1, { type: "stepOver" }, depths).index).toBe(8); // skips depth 2 and 3, back at depth 1
    const at4 = run([{ type: "goto", index: 4 }]);
    expect(playback(at4, { type: "stepOut" }, depths).index).toBe(6); // back to depth 2
  });

  it("stepping back reproduces exactly the same view", () => {
    const p = prepare(twoSum(), specs.twoSumHash);
    const forward = p.view(6);
    p.view(9);
    expect(p.view(6)).toEqual(forward);
  });
});

// ------------------------------------------------------------------ validation
function rand(n: number) { return Math.floor(Math.random() * n); }
function randomTree(): (number | null)[] {
  const size = rand(8);
  return Array.from({ length: size }, (_, i) => (i > 0 && Math.random() < 0.25 ? null : rand(50)));
}

const CASES: { name: string; spec: VizSpec; fixture: string; entry: string; input: () => Arg[] }[] = [
  { name: "Two Sum (hash map)", spec: specs.twoSumHash, fixture: "two_sum_hash", entry: "two_sum", input: () => { const a = Array.from({ length: 2 + rand(6) }, () => rand(20)); return [value(a), value(Math.random() < 0.8 ? a[0] + a.at(-1)! : 99)]; } },
  { name: "Two Sum (brute force)", spec: specs.twoSumBrute, fixture: "two_sum_brute", entry: "two_sum", input: () => { const a = Array.from({ length: 2 + rand(5) }, () => rand(20)); return [value(a), value(Math.random() < 0.8 ? a[0] + a.at(-1)! : 99)]; } },
  { name: "Valid Parentheses", spec: specs.validParentheses, fixture: "valid_parentheses", entry: "is_valid", input: () => [value(Array.from({ length: rand(9) }, () => "()[]{}"[rand(6)]).join(""))] },
  { name: "Binary Search", spec: specs.binarySearch, fixture: "binary_search", entry: "search", input: () => { const a = [...new Set(Array.from({ length: rand(10) }, () => rand(40)))].sort((x, y) => x - y); return [value(a), value(Math.random() < 0.6 && a.length ? a[rand(a.length)] : rand(40))]; } },
  { name: "Longest Substring", spec: specs.longestSubstring, fixture: "longest_substring", entry: "length_of_longest_substring", input: () => [value(Array.from({ length: rand(10) }, () => "abcd"[rand(4)]).join(""))] },
  { name: "Reverse Linked List", spec: specs.reverseList, fixture: "reverse_list", entry: "reverse_list", input: () => [{ kind: "linked_list", values: Array.from({ length: rand(6) }, () => rand(9)) }] },
  { name: "Maximum Depth", spec: specs.maxDepth, fixture: "max_depth", entry: "max_depth", input: () => [{ kind: "tree", values: randomTree() }] },
];

describe("spec validation", () => {
  for (const c of CASES) {
    it(`${c.name}: views and narration hold on 40 random inputs`, () => {
      const traces = Array.from({ length: 40 }, () => traceFixture(c.fixture, c.entry, c.input()));
      const problems = validateSpec(c.spec, source(c.fixture), traces);
      expect(problems).toEqual([]);
    });
  }

  it("catches broken specs", () => {
    const broken: VizSpec = {
      views: [{ kind: "map", id: "m", of: "seenn" }, { kind: "map", id: "m", of: "seen" }],
      lines: { 4: { narrate: [{ text: "{need} and {nope}" }] }, 99: {}, 5: { focus: { view: "zzz", key: "need" } } },
    };
    const messages = validateSpec(broken, source("two_sum_hash"), [twoSum()]).map((p) => `${p.where}: ${p.message}`).join("\n");
    expect(messages).toMatch(/duplicate view id/);
    expect(messages).toMatch(/"seenn" never exists/);
    expect(messages).toMatch(/line 99: the solution has only 8 lines/);
    expect(messages).toMatch(/no view called zzz/);
    expect(messages).toMatch(/no variable "nope"/);
  });
});
