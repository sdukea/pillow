// Interview problems: unseen ones, without a lesson, each with a reference solution the student's
// code is checked against, written in our own words. Slugs are from the curriculum's source lists.
import type { GrowthClass } from "../../engine/analysis/growth";
import type { Arg } from "../../engine/tracer/types";
import type { ConceptId } from "../knowledge/concepts";
import type { Checkable } from "../solve/check";

/** Running times an answer can claim, cheapest first. */
export const TIMES = ["1", "log n", "n", "n log n", "n²", "2ⁿ", "n!"] as const;
export type Time = (typeof TIMES)[number];

export interface InterviewProblem extends Checkable {
  title: string;
  url: string;
  difficulty: "Easy" | "Medium" | "Hard";
  concepts: ConceptId[];
  /** The problem, restated in our own words. */
  statement: string;
  /** File in engine/tracer/fixtures, without .py. */
  solution: string;
  /** Clarifying questions a candidate could ask. `matters` marks those that change the solution. */
  clarify: { ask: string; matters: boolean; answer: string }[];
  /** Approaches to choose from. `best` marks what an interviewer accepts as optimal. */
  approaches: { name: string; time: Time; works: boolean; best?: boolean; why: string }[];
  /**
   * The least work any correct solution needs (e.g. "n" to read every number). A measurement below
   * it means the work is hidden inside single lines (set(), sorted()), which Pillow can't count.
   */
  lowerBound: GrowthClass;
  followUp: { ask: string; choices: { text: string; correct?: boolean; why: string }[] };
}

const v = (value: unknown): Arg => ({ kind: "value", value });
const url = (slug: string) => `https://leetcode.com/problems/${slug}/`;

export const INTERVIEWS: InterviewProblem[] = [
  {
    slug: "contains-duplicate", title: "Contains Duplicate", url: url("contains-duplicate"), difficulty: "Easy", concepts: ["hash-set", "hash-lookup"],
    statement: "Given a list of integers, return True if any value appears at least twice, and False if every value is different.",
    solution: "contains_duplicate", entry: "contains_duplicate", params: ["nums"],
    example: [v([1, 2, 3, 1])], exampleLabel: "nums = [1, 2, 3, 1] → True",
    edgeCases: [[v([1, 2, 3, 4])], [v([1])], [v([5, 5])]],
    inputs: [{ name: "nums", type: "int-list", min: 1, max: 12 }],
    growth: { sizes: [16, 32, 64, 128, 256], input: (n) => [v(Array.from({ length: n }, (_, i) => i))], target: "n" },
    lowerBound: "n",
    clarify: [
      { ask: "Is the list sorted?", matters: true, answer: "No, it can be in any order. (If it were sorted, comparing neighbours would be enough.)" },
      { ask: "How long can the list be?", matters: true, answer: "Up to 100,000 numbers, so comparing every pair would be far too slow." },
      { ask: "Can the list be empty?", matters: true, answer: "No: it always has at least one number." },
      { ask: "Should I print the answer or return it?", matters: false, answer: "Return it. It doesn’t change the approach." },
    ],
    approaches: [
      { name: "Compare every pair of numbers", time: "n²", works: true, why: "Correct, but about n²/2 comparisons: too slow for 100,000 numbers." },
      { name: "Sort, then compare neighbours", time: "n log n", works: true, why: "Correct, and needs no extra memory if sorted in place, but sorting costs O(n log n)." },
      { name: "Remember the values seen so far in a set", time: "n", works: true, best: true, why: "One pass, and each “seen it before?” check takes about one step." },
      { name: "Binary search for each value", time: "n log n", works: false, why: "Binary search needs sorted data, and finding a value doesn’t tell you if it appears twice." },
    ],
    followUp: {
      ask: "Now you may only use O(1) extra memory. What’s the fastest way?",
      choices: [
        { text: "Sort the list in place, then compare neighbours", correct: true, why: "Equal values end up side by side. O(n log n) time, no extra structure." },
        { text: "Keep using a set", why: "A set can hold up to n values: O(n) memory." },
        { text: "Compare every pair", why: "It uses O(1) memory, but O(n²) time. Sorting is faster." },
      ],
    },
  },
  {
    slug: "climbing-stairs", title: "Climbing Stairs", url: url("climbing-stairs"), difficulty: "Easy", concepts: ["dynamic-programming", "memoization"],
    statement: "You climb a staircase of n steps, taking either 1 or 2 steps at a time. In how many different ways can you reach the top?",
    solution: "climbing_stairs", entry: "climb_stairs", params: ["n"],
    example: [v(3)], exampleLabel: "n = 3 → 3 (1+1+1, 1+2, 2+1)",
    edgeCases: [[v(1)], [v(2)], [v(10)]],
    inputs: [{ name: "n", type: "int", min: 1, max: 25 }],
    growth: { sizes: [16, 32, 64, 128, 256], input: (n) => [v(n)], target: "n" },
    lowerBound: "1",
    clarify: [
      { ask: "Does the order of steps matter? Is 1+2 different from 2+1?", matters: true, answer: "Yes: they’re different ways." },
      { ask: "How big can n be?", matters: true, answer: "Up to 45. Trying every sequence of moves (about 2ⁿ of them) would be far too slow." },
      { ask: "What’s the smallest n?", matters: true, answer: "n is at least 1." },
      { ask: "Can I take 3 steps at once?", matters: false, answer: "No, only 1 or 2, as stated." },
    ],
    approaches: [
      { name: "Plain recursion: ways(n) = ways(n − 1) + ways(n − 2)", time: "2ⁿ", works: true, why: "Correct, but it solves the same smaller staircases again and again: about 2ⁿ calls." },
      { name: "Build up from the bottom, remembering the last two answers", time: "n", works: true, best: true, why: "Each answer is the sum of the two before it, each computed once: O(n) time, O(1) memory." },
      { name: "Greedy: take 2 steps whenever you can", time: "n", works: false, why: "That finds one way to climb, not the number of ways." },
    ],
    followUp: {
      ask: "What if you could also take 3 steps at a time?",
      choices: [
        { text: "Add the answer three steps back too: ways(n) = ways(n − 1) + ways(n − 2) + ways(n − 3)", correct: true, why: "Your last move was 1, 2 or 3 steps, so add all three. Still O(n)." },
        { text: "Multiply the old answer by 3", why: "The ways don’t scale like that: count by last move instead." },
        { text: "It needs a completely different method", why: "Same idea, one more term." },
      ],
    },
  },
  {
    slug: "unique-paths", title: "Unique Paths", url: url("unique-paths"), difficulty: "Medium", concepts: ["dp-2d", "grid"],
    statement: "A robot starts in the top-left corner of an m × n grid and can only move right or down. How many different paths lead to the bottom-right corner?",
    solution: "unique_paths", entry: "unique_paths", params: ["m", "n"],
    example: [v(3), v(7)], exampleLabel: "m = 3, n = 7 → 28",
    edgeCases: [[v(1), v(1)], [v(3), v(2)], [v(1), v(5)]],
    inputs: [{ name: "m", type: "int", min: 1, max: 9 }, { name: "n", type: "int", min: 1, max: 9 }],
    growth: { sizes: [4, 8, 16, 32, 64], input: (n) => [v(n), v(n)], target: "n²" },
    lowerBound: "1",
    clarify: [
      { ask: "How big can the grid be?", matters: true, answer: "Up to 100 × 100. The count fits in an integer, but trying every path would take forever." },
      { ask: "Are there any blocked cells?", matters: true, answer: "No, not in this version." },
      { ask: "Is a 1 × 1 grid possible?", matters: true, answer: "Yes: there’s exactly one path, staying where you are." },
      { ask: "Can the robot move up or left?", matters: false, answer: "No, only right or down, as stated." },
    ],
    approaches: [
      { name: "Try every path, recursively", time: "2ⁿ", works: true, why: "Correct, but the number of paths explodes, and the same cells are counted again and again." },
      { name: "Fill a table: each cell = the cell above + the cell to the left", time: "n²", works: true, best: true, why: "Each cell is computed once from two neighbours: O(m·n)." },
      { name: "Count with a formula: choose which of the m + n − 2 moves go down", time: "n", works: true, best: true, why: "Also correct, and faster, but it’s the table that generalises (to obstacles, for instance)." },
      { name: "Greedy: always move right first", time: "n", works: false, why: "That’s one path, not the number of paths." },
    ],
    followUp: {
      ask: "What if some cells were blocked?",
      choices: [
        { text: "Same table, but a blocked cell has 0 paths", correct: true, why: "Paths can’t pass through it, so it contributes nothing to the cells after it." },
        { text: "The formula still works", why: "The formula counts paths through blocked cells too." },
        { text: "Use a heap", why: "Nothing here needs the smallest item: it’s counting." },
      ],
    },
  },
  {
    slug: "course-schedule", title: "Course Schedule", url: url("course-schedule"), difficulty: "Medium", concepts: ["topological-sort", "graphs"],
    statement: "There are num_courses courses, numbered 0 to num_courses − 1. Each pair [a, b] in prerequisites means course b must be taken before course a. Return True if it’s possible to take every course.",
    solution: "course_schedule", entry: "can_finish", params: ["num_courses", "prerequisites"],
    example: [v(4), v([[1, 0], [2, 0], [3, 1], [3, 2]])], exampleLabel: "num_courses = 4, prerequisites = [[1, 0], [2, 0], [3, 1], [3, 2]] → True",
    edgeCases: [
      [v(2), v([[1, 0], [0, 1]])], [v(1), v([])], [v(3), v([[1, 0], [2, 1], [0, 2]])], [v(5), v([[1, 0], [2, 1], [3, 2], [4, 3]])],
      [v(3), v([])], [v(4), v([[1, 0], [0, 1], [3, 2]])], [v(3), v([[0, 1], [0, 2], [1, 2]])], [v(2), v([[0, 0]])],
    ],
    growth: { sizes: [8, 16, 32, 64, 128], input: (n) => [v(n), v(Array.from({ length: n - 1 }, (_, i) => [i + 1, i]))], target: "n" },
    lowerBound: "n",
    clarify: [
      { ask: "Can the prerequisites form a loop?", matters: true, answer: "Yes. Courses in a loop can never be taken." },
      { ask: "Can one course have several prerequisites?", matters: true, answer: "Yes, any number." },
      { ask: "How many courses and pairs can there be?", matters: true, answer: "Up to 2,000 courses and 5,000 pairs." },
      { ask: "Do the courses have names?", matters: false, answer: "No, just numbers." },
    ],
    approaches: [
      { name: "Repeatedly take any course with nothing left to wait on", time: "n", works: true, best: true, why: "Each course and pair is handled once: O(V + E). Courses never taken are stuck in a loop." },
      { name: "Depth-first search, looking for a loop", time: "n", works: true, best: true, why: "Also O(V + E): a loop exists exactly when the search meets a course it’s still exploring." },
      { name: "Try every possible order of courses", time: "n!", works: true, why: "Correct in principle, but there are n! orders." },
      { name: "Sort the pairs, then check each in turn", time: "n log n", works: false, why: "Sorting pairs doesn’t follow chains of prerequisites, so loops go unnoticed." },
    ],
    followUp: {
      ask: "Now return an order to take the courses in, not just whether one exists.",
      choices: [
        { text: "Record the order in which courses come off the queue", correct: true, why: "Each course is taken only after everything it waits on, so that order works." },
        { text: "Sort the courses by number", why: "Numbers say nothing about prerequisites." },
        { text: "Sort the courses by how many prerequisites they have", why: "A course with one prerequisite can still come after a long chain." },
      ],
    },
  },
  {
    slug: "redundant-connection", title: "Redundant Connection", url: url("redundant-connection"), difficulty: "Medium", concepts: ["union-find", "graphs"],
    statement: "A tree of n nodes, numbered 1 to n, had one extra edge added. Given the edges in order, return an edge that can be removed so that a tree remains. If several could, return the one that appears last.",
    solution: "redundant_connection", entry: "find_redundant_connection", params: ["edges"],
    example: [v([[1, 2], [1, 3], [2, 3]])], exampleLabel: "edges = [[1, 2], [1, 3], [2, 3]] → [2, 3]",
    edgeCases: [
      [v([[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]])], [v([[1, 2], [2, 3], [1, 3]])], [v([[3, 4], [1, 2], [2, 4], [3, 5], [2, 5]])],
      [v([[1, 4], [3, 4], [1, 3], [1, 2], [4, 5]])], [v([[2, 1], [3, 1], [4, 2], [1, 4]])], [v([[1, 2], [1, 3], [1, 4], [3, 4]])],
    ],
    growth: { sizes: [8, 16, 32, 64, 128], input: (n) => [v([...Array.from({ length: n - 1 }, (_, i) => [i + 1, i + 2]), [1, n]])], target: "n" },
    lowerBound: "n",
    clarify: [
      { ask: "Is the graph connected?", matters: true, answer: "Yes: it was a tree, plus one edge." },
      { ask: "If several edges could be removed, which one should I return?", matters: true, answer: "The one that appears last in the list." },
      { ask: "Are the edges one-way?", matters: true, answer: "No, each edge goes both ways." },
      { ask: "Are the nodes numbered from 0 or 1?", matters: false, answer: "From 1. It only changes the size of an array." },
    ],
    approaches: [
      { name: "Union-find: return the first edge that joins two nodes already connected", time: "n", works: true, best: true, why: "Each edge is one find-and-join, nearly O(1) each: about O(n)." },
      { name: "For each edge, from the last, remove it and search the rest to see if it’s still connected", time: "n²", works: true, why: "Correct, but a full search for every edge: O(n²)." },
      { name: "Return the last edge in the list", time: "1", works: false, why: "The last edge isn’t always part of the loop." },
      { name: "Find the node with the most edges, and remove one of them", time: "n", works: false, why: "The loop needn’t pass through the busiest node." },
    ],
    followUp: {
      ask: "How would you count the separate groups in a graph instead?",
      choices: [
        { text: "Join the ends of every edge, then count the distinct roots", correct: true, why: "Each group ends with exactly one root." },
        { text: "Count the edges", why: "The number of edges doesn’t tell you how they’re grouped." },
        { text: "Sort the edges and count the gaps", why: "Edge order says nothing about which nodes are connected." },
      ],
    },
  },
];
