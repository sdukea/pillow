// The problem library. Pure data, importable by both the app (Vite) and build scripts (Node),
// so it refers to solution files by name rather than importing their text.
// Every entry carries a full lesson: a first approach, a better one, and the comparison.

import type { VizSpec } from "../../engine/interpreter/spec";
import * as specs from "../../engine/interpreter/fixtures/specs";
import type { Arg } from "../../engine/tracer/types";
import type { InputField } from "./inputs";
import type { Lesson } from "./lesson";
import { binarySearch } from "./lessons/binary-search";
import { longestSubstring } from "./lessons/longest-substring";
import { maximumDepth } from "./lessons/maximum-depth";
import { reverseLinkedList } from "./lessons/reverse-linked-list";
import { twoSum } from "./lessons/two-sum";
import { validParentheses } from "./lessons/valid-parentheses";
import { LIBRARY } from "./library";

/** Patterns in the order Home shows them. */
export const PATTERNS = ["Hashing", "Two pointers", "Stack", "Binary search", "Sliding window", "Linked list", "Trees and recursion", "Arrays"] as const;
export type Pattern = (typeof PATTERNS)[number];

export interface Provenance {
  model: string;
  attempts: number;
  /** Absent for lessons generated live: checked automatically, not yet by a person. */
  reviewer?: string;
  reviewedOn?: string;
}

export interface Approach {
  id: string;
  /** Short label for the approach switcher, e.g. "Brute force" or "Hash map". */
  name: string;
  /** File in engine/tracer/fixtures, without .py. */
  solution: string;
  entry: string;
  spec: VizSpec;
}

export interface Problem {
  slug: string;
  title: string;
  leetcode: { number: number; slug: string };
  pattern: Pattern;
  /** One line: what the problem asks, in plain language. */
  summary: string;
  /** The example input every approach is shown on. */
  example: Arg[];
  /** How the example input reads to a person, e.g. "nums = [2, 7, 11, 15], target = 9". */
  exampleLabel: string;
  approaches: Approach[];
  /** What a learner can type to run the approaches on their own input, one field per argument. */
  inputs: InputField[];
  /** LeetCode's guarantee about valid inputs, as Python defining valid(...). See Brief. */
  precondition?: string;
  /** The answer is a list whose order doesn't matter (Two Sum's indices can come either way). */
  unordered?: boolean;
  /** The full four-chapter lesson. Problems without one show the visualizer only. */
  lesson?: Lesson;
  /** Set for lessons drafted with AI: which model drafted it, and who reviewed it (if anyone yet). */
  provenance?: Provenance;
}

const v = (value: unknown): Arg => ({ kind: "value", value });

const HANDWRITTEN: Problem[] = [
  {
    slug: "two-sum",
    title: "Two Sum",
    leetcode: { number: 1, slug: "two-sum" },
    pattern: "Hashing",
    summary: "Find the two numbers in a list that add up to a target, and return where they are.",
    // The pair comes last, so brute force has to do real work before it finds it.
    example: [v([11, 15, 3, 8, 2, 7]), v(9)],
    exampleLabel: "nums = [11, 15, 3, 8, 2, 7], target = 9",
    inputs: [
      { name: "nums", type: "int-list", min: 2, max: 12 },
      { name: "target", type: "int" },
    ],
    unordered: true,
    // LeetCode guarantees exactly one answer; with several, correct approaches may pick different pairs.
    precondition: "def valid(nums, target):\n    pairs = [(i, j) for i in range(len(nums)) for j in range(i + 1, len(nums)) if nums[i] + nums[j] == target]\n    return len(pairs) == 1\n",
    approaches: [
      { id: "brute-force", name: "Brute force", solution: "two_sum_brute", entry: "two_sum", spec: specs.twoSumBrute },
      { id: "hash-map", name: "Hash map", solution: "two_sum_hash", entry: "two_sum", spec: specs.twoSumHash },
    ],
    lesson: twoSum,
  },
  {
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    leetcode: { number: 20, slug: "valid-parentheses" },
    pattern: "Stack",
    summary: "Decide whether every bracket in a string is closed by the right kind, in the right order.",
    example: [v("{[()]}()")],
    exampleLabel: "s = \"{[()]}()\"",
    inputs: [{ name: "s", type: "string", max: 16, hint: "Brackets only: ( ) [ ] { }", rule: "brackets-only" }],
    approaches: [
      { id: "delete-pairs", name: "Delete pairs", solution: "valid_parentheses_delete", entry: "is_valid", spec: specs.validParenthesesDelete },
      { id: "stack", name: "Stack", solution: "valid_parentheses", entry: "is_valid", spec: specs.validParentheses },
    ],
    lesson: validParentheses,
  },
  {
    slug: "binary-search",
    title: "Binary Search",
    leetcode: { number: 704, slug: "binary-search" },
    pattern: "Binary search",
    summary: "Find a number in a sorted list by repeatedly halving the part it could be in.",
    // Long enough that checking every number visibly loses to halving.
    example: [v(Array.from({ length: 12 }, (_, i) => 2 * i + 1)), v(19)],
    exampleLabel: "nums = [1, 3, 5, …, 23], target = 19",
    inputs: [
      { name: "nums", type: "int-list", max: 16, hint: "Sorted, no repeats", rule: "sorted-unique" },
      { name: "target", type: "int" },
    ],
    approaches: [
      { id: "check-every", name: "Check every number", solution: "binary_search_linear", entry: "search", spec: specs.binarySearchLinear },
      { id: "halving", name: "Halving", solution: "binary_search", entry: "search", spec: specs.binarySearch },
    ],
    lesson: binarySearch,
  },
  {
    slug: "longest-substring-without-repeating-characters",
    title: "Longest Substring Without Repeating Characters",
    leetcode: { number: 3, slug: "longest-substring-without-repeating-characters" },
    pattern: "Sliding window",
    summary: "Find the length of the longest stretch of a string where no character repeats.",
    example: [v("abcabcbb")],
    exampleLabel: "s = \"abcabcbb\"",
    inputs: [{ name: "s", type: "string", max: 16, hint: "Any characters, typed without quotes" }],
    approaches: [
      { id: "every-substring", name: "Every substring", solution: "longest_substring_brute", entry: "length_of_longest_substring", spec: specs.longestSubstringBrute },
      { id: "sliding-window", name: "Sliding window", solution: "longest_substring", entry: "length_of_longest_substring", spec: specs.longestSubstring },
    ],
    lesson: longestSubstring,
  },
  {
    slug: "reverse-linked-list",
    title: "Reverse Linked List",
    leetcode: { number: 206, slug: "reverse-linked-list" },
    pattern: "Linked list",
    summary: "Reverse a linked list so the last node becomes the first, by re-pointing each link.",
    example: [{ kind: "linked_list", values: [1, 2, 3, 4] }],
    exampleLabel: "head = 1 → 2 → 3 → 4",
    inputs: [{ name: "head", type: "linked-list", max: 8, hint: "The node values in order, e.g. [1, 2, 3]" }],
    approaches: [
      { id: "copy", name: "Copy and rebuild", solution: "reverse_list_copy", entry: "reverse_list", spec: specs.reverseListCopy },
      { id: "in-place", name: "Flip in place", solution: "reverse_list", entry: "reverse_list", spec: specs.reverseList },
    ],
    lesson: reverseLinkedList,
  },
  {
    slug: "maximum-depth-of-binary-tree",
    title: "Maximum Depth of Binary Tree",
    leetcode: { number: 104, slug: "maximum-depth-of-binary-tree" },
    pattern: "Trees and recursion",
    summary: "Find how many levels deep a binary tree goes.",
    example: [{ kind: "tree", values: [3, 9, 20, null, null, 15, 7] }],
    exampleLabel: "root = [3, 9, 20, null, null, 15, 7]",
    inputs: [{ name: "root", type: "tree", max: 15, hint: "Level by level, as on LeetCode; null for a missing child" }],
    approaches: [
      { id: "level-by-level", name: "Level by level", solution: "max_depth_bfs", entry: "max_depth", spec: specs.maxDepthBfs },
      { id: "recursion", name: "Recursion", solution: "max_depth", entry: "max_depth", spec: specs.maxDepth },
    ],
    lesson: maximumDepth,
  },
];

/** Hand-written lessons, then lessons drafted with AI and promoted after review (src/content/library). */
export const PROBLEMS: Problem[] = [...HANDWRITTEN, ...LIBRARY];

export const traceFile = (problem: Problem, approach: Approach) => `${problem.slug}--${approach.id}.json`;
export const growthFile = (problem: Problem) => `${problem.slug}--growth.json`;
