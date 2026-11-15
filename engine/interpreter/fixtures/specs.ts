// Visualization specs for the MVP reference solutions in engine/tracer/fixtures.
// They're the first real use of the spec format, and become lesson content in M3.
// Line numbers refer to the fixture files.

import type { VizSpec } from "../spec";

export const twoSumHash: VizSpec = {
  views: [
    { kind: "array", id: "nums", of: "nums", pointers: ["i"] },
    { kind: "map", id: "seen", of: "seen", label: "seen (number → index)" },
    { kind: "vars", id: "vars", show: ["x", "need", "target"] },
  ],
  lines: {
    2: { tag: "init", narrate: [{ text: "Start with an empty map. It will remember each number we pass and where it was." }] },
    3: { tag: "loop", narrate: [{ when: "_next_line == 8", text: "No numbers left to check." }, { text: "Look at index {i}: the number {x}." }] },
    4: { tag: "update", narrate: [{ text: "{x} needs a partner of {target} − {x} = {need} to reach {target}." }] },
    5: {
      tag: "lookup",
      focus: { view: "seen", key: "need" },
      narrate: [
        { when: "need in seen", text: "{need} is in the map: we saw it at index {seen[need]}. That's the pair." },
        { text: "{need} isn't in the map, so no earlier number pairs with {x}." },
      ],
    },
    6: { tag: "return", narrate: [{ text: "Return the two indices, {seen[need]} and {i}." }] },
    7: { tag: "update", narrate: [{ text: "Remember {x} at index {i}, in case a later number needs it." }] },
    8: { tag: "return", narrate: [{ text: "No pair adds up to {target}." }] },
  },
};

export const twoSumBrute: VizSpec = {
  views: [
    { kind: "array", id: "nums", of: "nums", pointers: ["i", "j"] },
    { kind: "vars", id: "vars", show: ["nums[i] + nums[j]", "target"] },
  ],
  lines: {
    2: { tag: "loop", narrate: [{ when: "_next_line == 6", text: "Every pair has been checked." }, { text: "Fix the first number at index {i}." }] },
    3: { tag: "loop", narrate: [{ when: "_next_line == 2", text: "No partner for index {i}; move the first number on." }, { text: "Try pairing it with index {j}." }] },
    4: {
      tag: "compare",
      narrate: [
        { when: "nums[i] + nums[j] == target", text: "{nums[i]} + {nums[j]} = {target}. Found it." },
        { text: "{nums[i]} + {nums[j]} = {nums[i] + nums[j]}, not {target}." },
      ],
    },
    5: { tag: "return", narrate: [{ text: "Return indices {i} and {j}." }] },
    6: { tag: "return", narrate: [{ text: "No pair adds up to {target}." }] },
  },
};

export const validParentheses: VizSpec = {
  views: [
    { kind: "array", id: "s", of: "s" },
    { kind: "stack", id: "stack", of: "stack", label: "stack (open brackets waiting)" },
    { kind: "vars", id: "vars", show: ["ch"] },
  ],
  lines: {
    4: { tag: "loop", narrate: [{ when: "_next_line == 11", text: "Every character has been read." }, { text: "Read '{ch}'." }] },
    5: { tag: "branch", narrate: [{ when: "ch in pairs", text: "'{ch}' is a closing bracket." }, { text: "'{ch}' is an opening bracket." }] },
    6: {
      tag: "compare",
      narrate: [
        { when: "not stack", text: "Nothing is open, so '{ch}' has nothing to close." },
        { when: "stack[-1] != pairs[ch]", text: "The last open bracket is '{stack[-1]}', but '{ch}' needs '{pairs[ch]}'." },
        { text: "'{ch}' closes the '{stack[-1]}' on top." },
      ],
    },
    7: { tag: "return", narrate: [{ text: "Mismatched, so the string isn't valid." }] },
    8: { tag: "update", narrate: [{ text: "Pop the matched '{pairs[ch]}'." }] },
    10: { tag: "update", narrate: [{ text: "Push '{ch}' and wait for its closing bracket." }] },
    11: { tag: "return", narrate: [{ when: "not stack", text: "Everything was closed in order: valid." }, { text: "Some brackets were never closed: not valid." }] },
  },
};

export const binarySearch: VizSpec = {
  views: [
    { kind: "array", id: "nums", of: "nums", pointers: ["lo", "mid", "hi"], range: { from: "lo", to: "hi", label: "could still hold the target" } },
    { kind: "vars", id: "vars", show: ["target"] },
  ],
  lines: {
    2: { tag: "init", narrate: [{ text: "The target could be anywhere from index {lo} to {hi}." }] },
    3: { tag: "loop", narrate: [{ when: "lo > hi", text: "The range is empty: the target isn't here." }, { text: "Indices {lo} to {hi} are still possible." }] },
    4: { tag: "update", narrate: [{ text: "Check the middle: index {mid}, which holds {nums[mid]}." }] },
    5: { tag: "compare", narrate: [{ when: "nums[mid] == target", text: "{nums[mid]} is the target." }, { text: "{nums[mid]} isn't {target}." }] },
    6: { tag: "return", narrate: [{ text: "Found it at index {mid}." }] },
    7: { tag: "compare", narrate: [{ when: "nums[mid] < target", text: "{nums[mid]} is too small, so the target must be to the right." }, { text: "{nums[mid]} is too big, so the target must be to the left." }] },
    8: { tag: "move", narrate: [{ text: "Everything up to index {mid} is too small. lo jumps to {lo}." }] },
    10: { tag: "move", narrate: [{ text: "Everything from index {mid} on is too big. hi drops to {hi}." }] },
    11: { tag: "return", narrate: [{ text: "{target} isn't in the list." }] },
  },
};

export const longestSubstring: VizSpec = {
  views: [
    { kind: "array", id: "s", of: "s", pointers: ["left", "right"], range: { from: "left", to: "right", label: "window" } },
    { kind: "map", id: "last_seen", of: "last_seen", label: "last seen at" },
    { kind: "vars", id: "vars", show: ["right - left + 1", "best"] },
  ],
  lines: {
    5: { tag: "loop", narrate: [{ when: "_next_line == 10", text: "The window has reached the end of the string." }, { text: "Extend the window to include '{ch}' at {right}." }] },
    6: {
      tag: "lookup",
      focus: { view: "last_seen", key: "ch" },
      narrate: [
        { when: "ch in last_seen and last_seen[ch] >= left", text: "'{ch}' is already in the window, at {last_seen[ch]}. The window must shrink." },
        { when: "ch in last_seen", text: "'{ch}' was seen at {last_seen[ch]}, but that's before the window, so it doesn't matter." },
        { text: "'{ch}' isn't in the window, so the window can grow." },
      ],
    },
    7: { tag: "move", narrate: [{ text: "Move left past the earlier '{ch}', to {left}." }] },
    8: { tag: "update", narrate: [{ text: "Remember '{ch}' was last seen at {right}." }] },
    9: { tag: "update", narrate: [{ text: "The window is {right - left + 1} long. The best so far is {best}." }] },
    10: { tag: "return", narrate: [{ text: "The longest window without repeats was {best} long." }] },
  },
};

export const reverseList: VizSpec = {
  views: [{ kind: "linked-list", id: "list", pointers: ["prev", "cur", "nxt"] }],
  lines: {
    2: { tag: "init", narrate: [{ text: "prev starts at nothing: the reversed part is empty." }] },
    3: { tag: "init", narrate: [{ when: "cur == None", text: "The list is empty, so cur starts at nothing." }, { text: "cur starts at the head, {cur.val}." }] },
    4: { tag: "loop", narrate: [{ when: "cur == None", text: "cur is nothing: every node has been reversed." }, { text: "cur is {cur.val}, so there's still a node to reverse." }] },
    5: { tag: "init", narrate: [{ when: "nxt == None", text: "Save what comes after {cur.val}: nothing." }, { text: "Save what comes after {cur.val} ({nxt.val}) before we break the link." }] },
    6: { tag: "update", narrate: [{ when: "prev == None", text: "Point {cur.val} back at nothing. It becomes the new tail." }, { text: "Point {cur.val} back at {prev.val}." }] },
    7: { tag: "move", narrate: [{ text: "prev moves up to {prev.val}." }] },
    8: { tag: "move", narrate: [{ when: "cur == None", text: "cur moves on to nothing: that was the last node." }, { text: "cur moves on to {cur.val}." }] },
    9: { tag: "return", narrate: [{ when: "prev == None", text: "The list was empty." }, { text: "prev is the new head: {prev.val}." }] },
  },
};

export const maxDepth: VizSpec = {
  views: [
    { kind: "tree", id: "tree", root: "root", current: "root" },
    { kind: "call-stack", id: "calls", show: ["root.val"] },
  ],
  lines: {
    2: { tag: "branch", narrate: [{ when: "root == None", text: "There's no node here." }, { text: "Node {root.val} exists, so measure below it." }] },
    3: { tag: "return", narrate: [{ text: "An empty spot has depth 0." }] },
    4: { tag: "call", narrate: [{ when: "_entered", text: "Go down into {root.val}'s left side." }, { text: "{root.val}'s left side is {left} deep." }] },
    5: { tag: "call", narrate: [{ when: "_entered", text: "Now go down into {root.val}'s right side." }, { text: "{root.val}'s right side is {right} deep." }] },
    6: { tag: "return", narrate: [{ text: "So {root.val} is 1 + max({left}, {right}) = {1 + max(left, right)} deep." }] },
  },
};
