// The problem library. Pure data, importable by both the app (Vite) and build scripts (Node),
// so it refers to solution files by name rather than importing their text.
// M3 grows each entry into a full lesson (plain-language statement, chapters, line notes).

import type { VizSpec } from "../../engine/interpreter/spec";
import * as specs from "../../engine/interpreter/fixtures/specs";
import type { Arg } from "../../engine/tracer/types";
import type { Lesson } from "./lesson";
import { reverseLinkedList } from "./lessons/reverse-linked-list";
import { twoSum } from "./lessons/two-sum";

export type Pattern = "Hashing" | "Stack" | "Binary search" | "Sliding window" | "Linked list" | "Trees and recursion";

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
  /** The full four-chapter lesson. Problems without one show the visualizer only. */
  lesson?: Lesson;
}

const v = (value: unknown): Arg => ({ kind: "value", value });

export const PROBLEMS: Problem[] = [
  {
    slug: "two-sum",
    title: "Two Sum",
    leetcode: { number: 1, slug: "two-sum" },
    pattern: "Hashing",
    summary: "Find the two numbers in a list that add up to a target, and return where they are.",
    // The pair comes last, so brute force has to do real work before it finds it.
    example: [v([11, 15, 3, 8, 2, 7]), v(9)],
    exampleLabel: "nums = [11, 15, 3, 8, 2, 7], target = 9",
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
    example: [v("([]{})")],
    exampleLabel: "s = \"([]{})\"",
    approaches: [{ id: "stack", name: "Stack", solution: "valid_parentheses", entry: "is_valid", spec: specs.validParentheses }],
  },
  {
    slug: "binary-search",
    title: "Binary Search",
    leetcode: { number: 704, slug: "binary-search" },
    pattern: "Binary search",
    summary: "Find a number in a sorted list by repeatedly halving the part it could be in.",
    example: [v([-1, 0, 3, 5, 9, 12]), v(9)],
    exampleLabel: "nums = [-1, 0, 3, 5, 9, 12], target = 9",
    approaches: [{ id: "halving", name: "Halving", solution: "binary_search", entry: "search", spec: specs.binarySearch }],
  },
  {
    slug: "longest-substring-without-repeating-characters",
    title: "Longest Substring Without Repeating Characters",
    leetcode: { number: 3, slug: "longest-substring-without-repeating-characters" },
    pattern: "Sliding window",
    summary: "Find the length of the longest stretch of a string where no character repeats.",
    example: [v("abcabcbb")],
    exampleLabel: "s = \"abcabcbb\"",
    approaches: [{ id: "sliding-window", name: "Sliding window", solution: "longest_substring", entry: "length_of_longest_substring", spec: specs.longestSubstring }],
  },
  {
    slug: "reverse-linked-list",
    title: "Reverse Linked List",
    leetcode: { number: 206, slug: "reverse-linked-list" },
    pattern: "Linked list",
    summary: "Reverse a linked list so the last node becomes the first, by re-pointing each link.",
    example: [{ kind: "linked_list", values: [1, 2, 3, 4] }],
    exampleLabel: "head = 1 → 2 → 3 → 4",
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
    summary: "Find how many levels deep a binary tree goes, by asking each side how deep it is.",
    example: [{ kind: "tree", values: [3, 9, 20, null, null, 15, 7] }],
    exampleLabel: "root = [3, 9, 20, null, null, 15, 7]",
    approaches: [{ id: "recursion", name: "Recursion", solution: "max_depth", entry: "max_depth", spec: specs.maxDepth }],
  },
];

export const traceFile = (problem: Problem, approach: Approach) => `${problem.slug}--${approach.id}.json`;
export const growthFile = (problem: Problem) => `${problem.slug}--growth.json`;
