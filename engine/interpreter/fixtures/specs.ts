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
    2: { tag: "loop", narrate: [{ when: "_next_line == 6", text: "Every pair has been checked." }, { text: "First number: {nums[i]}, at index {i}. Now try each number after it as its partner." }] },
    3: { tag: "loop", narrate: [{ when: "_next_line == 2", text: "Nothing after {nums[i]} adds up to {target} with it. Move on to the next first number." }, { text: "Partner: {nums[j]}, at index {j}. Do {nums[i]} and {nums[j]} add up to {target}?" }] },
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
    2: { tag: "init", narrate: [{ text: "Note which opening bracket each closing bracket needs." }] },
    3: { tag: "init", narrate: [{ text: "Start with an empty stack of open brackets." }] },
    4: { tag: "loop", narrate: [{ when: "_next_line == 11", text: "Every character has been read." }, { text: "Read the next bracket: '{ch}'." }] },
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
    2: { tag: "init", narrate: [{ when: "hi < lo", text: "The list is empty, so there's nowhere to look." }, { text: "The target could be anywhere from index {lo} to {hi}." }] },
    3: { tag: "loop", narrate: [{ when: "lo > hi", text: "The range is empty: the target isn't here." }, { text: "The target can only be between index {lo} and {hi}: {hi - lo + 1} numbers left to consider." }] },
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
    2: { tag: "init", narrate: [{ text: "Start a map from each character to where it was last seen." }] },
    3: { tag: "init", narrate: [{ text: "The window starts at the beginning of the string." }] },
    4: { tag: "init", narrate: [{ text: "No window measured yet, so the best is 0." }] },
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

export const reverseListCopy: VizSpec = {
  views: [
    { kind: "linked-list", id: "list", pointers: ["node", "new_head"] },
    { kind: "array", id: "values", of: "values", label: "values (copied out)" },
  ],
  lines: {
    2: { tag: "init", narrate: [{ text: "Start an empty list to copy the values into." }] },
    3: { tag: "init", narrate: [{ when: "node == None", text: "The list is empty, so there's nothing to copy." }, { text: "Start reading at the head, {node.val}." }] },
    4: { tag: "loop", narrate: [{ when: "node == None", text: "We've read every node." }, { text: "There's still a node to read: {node.val}." }] },
    5: { tag: "update", narrate: [{ text: "Copy {values[-1]} into the list. That's {len(values)} copied so far." }] },
    6: { tag: "move", narrate: [{ when: "node == None", text: "Move on: that was the last node." }, { text: "Move on to {node.val}." }] },
    7: { tag: "init", narrate: [{ text: "Now build a new list. It starts empty." }] },
    8: { tag: "loop", narrate: [{ when: "_next_line == 10", text: "Every value has been placed." }, { text: "Take the next copied value, {v}." }] },
    9: { tag: "update", narrate: [{ text: "Create a new node for {v} in front of the new list, so the first value ends up last." }] },
    10: { tag: "return", narrate: [{ when: "new_head == None", text: "The list was empty, so return nothing." }, { text: "Return the new list, which starts at {new_head.val}." }] },
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

export const validParenthesesDelete: VizSpec = {
  views: [
    { kind: "array", id: "chars", of: "chars", pointers: ["i"], label: "chars (pairs get deleted)" },
    { kind: "vars", id: "vars", show: ["removed"] },
  ],
  lines: {
    2: { tag: "init", narrate: [{ text: "Note which closing bracket each opening bracket needs." }] },
    3: { tag: "init", narrate: [{ text: "Copy the characters into a list, so matched pairs can be deleted from it." }] },
    4: { tag: "init", narrate: [{ text: "Pretend something was removed, so the first pass runs." }] },
    5: { tag: "loop", narrate: [{ when: "_next_line == 12", text: "A whole pass found no pair, so stop." }, { text: "Scan the list again from the start." }] },
    6: { tag: "init", narrate: [{ text: "Nothing removed yet in this pass." }] },
    7: { tag: "loop", narrate: [{ when: "_next_line == 5", text: "Reached the end of the list without finding a pair." }, { text: "Are {chars[i]} and {chars[i + 1]}, side by side at {i} and {i + 1}, a matching pair?" }] },
    8: {
      tag: "compare",
      narrate: [
        { when: "chars[i] in pairs and pairs[chars[i]] == chars[i + 1]", text: "{chars[i]} is closed right away by {chars[i + 1]}: a matching pair." },
        { when: "chars[i] in pairs", text: "{chars[i]} is followed by {chars[i + 1]}, not by {pairs[chars[i]]}. Keep looking." },
        { text: "{chars[i]} is a closing bracket, so it can't start a pair. Keep looking." },
      ],
    },
    9: { tag: "update", narrate: [{ text: "Delete the pair. {len(chars)} characters left." }] },
    10: { tag: "update", narrate: [{ text: "Remember that this pass removed something." }] },
    11: { tag: "loop", narrate: [{ text: "Start over from the beginning: deleting may have brought a new pair together." }] },
    12: { tag: "return", narrate: [{ when: "not chars", text: "Everything paired off: valid." }, { text: "Some brackets never found a partner: not valid." }] },
  },
};

export const binarySearchLinear: VizSpec = {
  views: [
    { kind: "array", id: "nums", of: "nums", pointers: ["i"] },
    { kind: "vars", id: "vars", show: ["target"] },
  ],
  lines: {
    2: { tag: "loop", narrate: [{ when: "_next_line == 5", text: "Every number has been checked." }, { text: "Check index {i}: is {nums[i]} the target, {target}?" }] },
    3: { tag: "compare", narrate: [{ when: "nums[i] == target", text: "{nums[i]} is the target." }, { text: "{nums[i]} isn't {target}. Move on." }] },
    4: { tag: "return", narrate: [{ text: "Found it at index {i}, after checking {i + 1} numbers." }] },
    5: { tag: "return", narrate: [{ text: "{target} isn't in the list. Every number had to be checked to be sure." }] },
  },
};

export const longestSubstringBrute: VizSpec = {
  views: [
    { kind: "array", id: "s", of: "s", pointers: ["start", "end"], range: { from: "start", to: "end", label: "substring" } },
    { kind: "set", id: "seen", of: "seen", label: "seen (in this substring)" },
    { kind: "vars", id: "vars", show: ["best"] },
  ],
  lines: {
    2: { tag: "init", narrate: [{ text: "Nothing measured yet, so the best length is 0." }] },
    3: { tag: "loop", narrate: [{ when: "_next_line == 10", text: "Every starting point has been tried." }, { text: "Start fresh at '{s[start]}' (index {start}) and grow a substring with no repeats." }] },
    4: { tag: "init", narrate: [{ text: "Begin with an empty set for this starting point." }] },
    5: { tag: "loop", narrate: [{ when: "_next_line == 3", text: "This substring reached the end of the string." }, { text: "Can the substring take '{s[end]}' (index {end}) too?" }] },
    6: { tag: "lookup", focus: { view: "seen", key: "s[end]" }, narrate: [{ when: "s[end] in seen", text: "'{s[end]}' is already in this substring, so it can't grow any further." }, { text: "'{s[end]}' is new to this substring." }] },
    7: { tag: "loop", narrate: [{ text: "Stop extending, and try the next starting point." }] },
    8: { tag: "update", narrate: [{ text: "Add '{s[end]}' to the set." }] },
    9: { tag: "update", narrate: [{ text: "This substring is {end - start + 1} long. The best so far is {best}." }] },
    10: { tag: "return", narrate: [{ text: "The longest substring without repeats was {best} long." }] },
  },
};

export const maxDepthBfs: VizSpec = {
  views: [
    { kind: "tree", id: "tree", root: "root", current: "node", waiting: "queue", showReturns: false },
    { kind: "queue", id: "queue", of: "queue", label: "queue (the next level, front first)" },
    { kind: "vars", id: "vars", show: ["depth"] },
  ],
  lines: {
    2: { tag: "branch", narrate: [{ when: "root == None", text: "The tree is empty." }, { text: "There's a root, so there's at least one level." }] },
    3: { tag: "return", narrate: [{ text: "An empty tree has depth 0." }] },
    4: { tag: "init", narrate: [{ text: "No levels counted yet." }] },
    5: { tag: "init", narrate: [{ text: "Put the root in the queue. On its own, it's the whole first level." }] },
    6: { tag: "loop", narrate: [{ when: "_next_line == 14", text: "The queue is empty: there are no more levels." }, { when: "len(queue) == 1", text: "The queue holds the next level: 1 node." }, { text: "The queue holds the next level: {len(queue)} nodes." }] },
    7: { tag: "update", narrate: [{ text: "Count this level. Depth is now {depth}." }] },
    8: { tag: "loop", narrate: [{ when: "_next_line == 6", text: "Every node on this level has been handled." }, { text: "Handle the next node on this level." }] },
    9: { tag: "update", narrate: [{ text: "Take {node.val} from the front of the queue." }] },
    10: { tag: "branch", narrate: [{ when: "node.left", text: "{node.val} has a left child, {node.left.val}." }, { text: "{node.val} has no left child." }] },
    11: { tag: "update", narrate: [{ text: "Queue {node.left.val} for the next level." }] },
    12: { tag: "branch", narrate: [{ when: "node.right", text: "{node.val} has a right child, {node.right.val}." }, { text: "{node.val} has no right child." }] },
    13: { tag: "update", narrate: [{ text: "Queue {node.right.val} for the next level." }] },
    14: { tag: "return", narrate: [{ text: "The tree is {depth} levels deep." }] },
  },
};
