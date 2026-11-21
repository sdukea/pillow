// The 16-week plan's weeks: what each teaches, in dependency order. Kept apart from the 205-problem
// curriculum so the main bundle can use the weeks without loading the problem lists.
import type { ConceptId } from "../knowledge/concepts";

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

/** The plan's default first Monday; week 16 ends Sunday 4 April 2027. Learners will set their own (P5). */
export const PLAN_START = "2026-12-14";

const START_KEY = "pillow.planStart";

/** The learner's own first day of the plan (a preference, not evidence), or the default. */
export function planStart(): string {
  try { const v = localStorage.getItem(START_KEY); if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v; } catch { /* storage may be unavailable */ }
  return PLAN_START;
}

export function setPlanStart(date: string) {
  try { localStorage.setItem(START_KEY, date); } catch { /* a convenience */ }
}

export function weekDates(week: number, start = PLAN_START): { from: Date; to: Date } {
  const from = new Date(`${start}T00:00:00`);
  from.setDate(from.getDate() + (week - 1) * 7);
  const to = new Date(from);
  to.setDate(to.getDate() + 6);
  return { from, to };
}
