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
import { introWeek } from "./weeks";

export { introWeek, WEEKS, type Week } from "./weeks";
import { PROBLEMS } from "../content/problems";

export type Tier = "core" | "reinforcement" | "stretch";
export type ListId = "blind-75" | "neetcode-150" | "grind-169";

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

export { PLAN_START, weekDates } from "./weeks";
