// The curriculum: every problem from Blind 75, NeetCode 150 and Grind 169 (205 once deduplicated),
// tagged with concepts, tiered and placed in a 16-week plan ordered by concept dependencies.
//
// Everything here is derived deterministically from src/curriculum/sources.json (extracted from
// sumitsingh4411/faang, MIT, by scripts/build-curriculum.ts). Nothing about a problem is invented:
// the slug comes from its official URL, and LeetCode numbers appear only for problems with a
// built lesson, where they were checked by hand. Concept tags come from the lists' topics through
// the table below, so every problem is marked `review: "auto"` until a person checks its tags.
import sources from "./sources.json";
import { conceptById, type ConceptId } from "../knowledge/concepts";
import { PROBLEMS } from "../content/problems";

export type Tier = "core" | "reinforcement" | "stretch";
export type ListId = "blind-75" | "neetcode-150" | "grind-169";

export interface Week {
  week: number;
  title: string;
  /** Concepts first taught this week. Each one's prerequisites are taught this week or earlier. */
  introduces: ConceptId[];
}

export const WEEKS: Week[] = [
  { week: 1, title: "Arrays and hashing", introduces: ["arrays", "loops", "strings", "nested-loops", "complexity", "space-complexity", "hash-map", "hash-set", "hash-lookup", "complement", "time-space", "counting"] },
  { week: 2, title: "Two pointers and sorting", introduces: ["invariant", "two-pointers", "sorted-order", "sorting", "grid"] },
  { week: 3, title: "Sliding windows and running totals", introduces: ["sliding-window", "prefix-sum", "kadane", "queue", "deque"] },
  { week: 4, title: "Stacks", introduces: ["stack", "matching", "monotonic-stack", "design"] },
  { week: 5, title: "Binary search", introduces: ["binary-search"] },
  { week: 6, title: "Linked lists", introduces: ["linked-list", "pointer-rewiring", "fast-slow"] },
  { week: 7, title: "Recursion and trees", introduces: ["recursion", "call-stack", "trees", "tree-recursion", "bfs", "divide-conquer"] },
  { week: 8, title: "Search trees and tries", introduces: ["bst", "trie"] },
  { week: 9, title: "Heaps and intervals", introduces: ["heap", "quickselect", "intervals"] },
  { week: 10, title: "Backtracking", introduces: ["backtracking"] },
  { week: 11, title: "Graphs", introduces: ["graphs", "graph-traversal"] },
  { week: 12, title: "Advanced graphs", introduces: ["topological-sort", "union-find", "shortest-path", "mst"] },
  { week: 13, title: "Dynamic programming", introduces: ["memoization", "dynamic-programming"] },
  { week: 14, title: "Two-dimensional DP", introduces: ["dp-2d", "knapsack"] },
  { week: 15, title: "Greedy, bits and maths", introduces: ["greedy", "bit-manipulation", "math"] },
  { week: 16, title: "Review and mock interviews", introduces: [] },
];

/** The week each concept is first taught. */
export const introWeek = new Map<ConceptId, number>(WEEKS.flatMap((w) => w.introduces.map((c) => [c, w.week] as const)));

/** A list's topic label → the concepts it exercises. Some labels depend on the list's section. */
function topicConcepts(topic: string, section: string): ConceptId[] {
  const inTrees = /^Trees?\b/.test(section);
  const twoD = section.startsWith("2-D");
  const table: Record<string, ConceptId[]> = {
    "Arrays": ["arrays"], "Strings": ["strings"], "Hash Map": ["hash-map", "hash-lookup"], "Hash Set": ["hash-set", "hash-lookup"],
    "Boyer-Moore": ["counting"], "Bucket Sort": ["counting"], "Two Pointers": ["two-pointers"], "Reversal": ["two-pointers"],
    "Sliding Window": ["sliding-window"], "Deque": ["deque", "sliding-window"], "Prefix Sum": ["prefix-sum"], "Kadane's": ["kadane"],
    "Stack": ["stack"], "Monotonic Stack": ["monotonic-stack"], "Design": ["design"], "Binary Search": ["binary-search"],
    "Linked List": ["linked-list"], "Fast & Slow": ["fast-slow"], "Merge Sort": ["sorting", "divide-conquer"],
    "DFS": ["tree-recursion"], "BFS": inTrees ? ["bfs"] : ["graph-traversal"], "BFS/DFS": ["graph-traversal"],
    "Binary Search Tree": ["bst"], "Trie": ["trie"], "Heap": ["heap"], "Quickselect": ["quickselect"], "Intervals": ["intervals"],
    "Backtracking": ["backtracking"], "Topological Sort": ["topological-sort"], "Union Find": ["union-find"],
    "Dijkstra": ["shortest-path"], "Bellman-Ford": ["shortest-path"], "Minimum Spanning Tree": ["mst"], "Eulerian Path": ["graph-traversal"],
    "Matrix": ["grid"], "Dynamic Programming": twoD ? ["dp-2d"] : ["dynamic-programming"], "Memoization": ["memoization"],
    "0/1 Knapsack": ["knapsack"], "Unbounded Knapsack": ["knapsack"], "Greedy": ["greedy"], "Bit Manipulation": ["bit-manipulation"],
    "Math": ["math"], "Divide & Conquer": ["divide-conquer"],
  };
  const concepts = table[topic];
  if (!concepts) throw new Error(`no concepts for topic "${topic}"`);
  return concepts;
}

/** The data structure a section is about, when the section name says so unambiguously. */
function sectionStructure(section: string): ConceptId | null {
  const s = section.replace(/ — Extended$/, "");
  if (s === "Linked List") return "linked-list";
  if (s === "Tree" || s === "Trees") return "trees";
  if (s === "Graph" || s === "Graphs" || s === "Advanced Graphs") return "graphs";
  if (s === "Tries") return "trie";
  if (s === "Matrix") return "grid";
  return null;
}

/** Which list's topic is preferred when lists disagree: NeetCode's sections are the most specific. */
const PREFERENCE: ListId[] = ["neetcode-150", "grind-169", "blind-75"];

export interface CurriculumProblem {
  /** LeetCode's slug: the stable ID. */
  slug: string;
  title: string;
  url: string;
  difficulty: "Easy" | "Medium" | "Hard";
  /** Verified LeetCode number, only where a lesson's author checked it. */
  number?: number;
  lists: ListId[];
  tier: Tier;
  week: number;
  /** The technique the problem is about. */
  primary: ConceptId;
  /** Every concept it exercises, the primary first. All are taught by its week. */
  concepts: ConceptId[];
  /** Concepts to know first: the prerequisites of its concepts that it doesn't itself teach. */
  prerequisites: ConceptId[];
  lesson: "built" | "planned";
  /** "auto" until a person has checked the concept tags. */
  review: "auto" | "reviewed";
}

interface Source { slug: string; title: string; difficulty: "Easy" | "Medium" | "Hard"; entries: { list: ListId; section: string; topic: string }[] }

const built = new Map(PROBLEMS.map((p) => [p.slug, p]));
const latest = (cs: ConceptId[]) => Math.max(...cs.map((c) => introWeek.get(c) ?? Infinity));

function tierOf(lists: ListId[]): Tier {
  if (lists.length === 3 || lists.includes("blind-75")) return "core";
  return lists.length === 2 ? "reinforcement" : "stretch";
}

function toProblem(s: Source): CurriculumProblem {
  const lists = s.entries.map((e) => e.list).sort((a, b) => PREFERENCE.indexOf(a) - PREFERENCE.indexOf(b));
  const main = s.entries.find((e) => e.list === lists[0])!;
  const own = topicConcepts(main.topic, main.section);
  const structure = sectionStructure(main.section);
  const required = [...new Set([...own, ...(structure ? [structure] : [])])];
  const week = latest(required);
  // Other lists' topics are kept only if they're already taught by this week: they're alternative
  // views of the same problem (Best Time to Buy and Sell Stock is "Greedy" in one list, "Sliding
  // Window" in another) and shouldn't push it later.
  const extra = s.entries.filter((e) => e !== main).flatMap((e) => topicConcepts(e.topic, e.section)).filter((c) => (introWeek.get(c) ?? Infinity) <= week);
  const concepts = [...new Set([...required, ...extra])];
  const prerequisites = [...new Set(concepts.flatMap((c) => conceptById.get(c)!.requires as ConceptId[]))].filter((c) => !concepts.includes(c));
  const lesson = built.get(s.slug);
  return {
    slug: s.slug, title: s.title, url: `https://leetcode.com/problems/${s.slug}/`, difficulty: s.difficulty,
    ...(lesson ? { number: lesson.leetcode.number } : {}),
    lists, tier: tierOf(lists), week, primary: own[0], concepts, prerequisites,
    lesson: lesson ? "built" : "planned", review: "auto",
  };
}

const TIER_ORDER: Tier[] = ["core", "reinforcement", "stretch"];
const DIFFICULTY_ORDER = ["Easy", "Medium", "Hard"];

/** The whole curriculum, in study order: by week, then tier, then difficulty, then title. */
export const CURRICULUM: CurriculumProblem[] = (sources.problems as Source[]).map(toProblem).sort((a, b) =>
  a.week - b.week || TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) ||
  DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty) || a.title.localeCompare(b.title));

export const ATTRIBUTION = sources.attribution;

/** The plan's default first Monday; week 16 ends Sunday 4 April 2027. Learners will set their own (P5). */
export const PLAN_START = "2026-12-14";

export function weekDates(week: number, start = PLAN_START): { from: Date; to: Date } {
  const from = new Date(`${start}T00:00:00`);
  from.setDate(from.getDate() + (week - 1) * 7);
  const to = new Date(from);
  to.setDate(to.getDate() + 6);
  return { from, to };
}
