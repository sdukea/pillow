// Misconceptions: specific wrong beliefs a student can show, each tied to the concept it
// undermines. Wrong answers in a lesson's reasoning step name the misconception they reveal, so
// the knowledge map can say not just "shaky" but *what* seems to be misunderstood, and the reply
// can address exactly that. Curated, like the concepts.

import type { ConceptId } from "./concepts";

export interface Misconception {
  id: string;
  concept: ConceptId;
  /** What the student seems to believe, phrased so it can follow "You seemed to think…". */
  belief: string;
}

export const MISCONCEPTIONS = [
  { id: "more-loops-is-thorough", concept: "complexity", belief: "more loops just means being more thorough, not more work" },
  { id: "pairs-are-linear", concept: "nested-loops", belief: "checking every pair takes about as many steps as there are items" },
  { id: "lookup-scans", concept: "hash-lookup", belief: "looking something up in a hash map means scanning every key" },
  { id: "store-everything-first", concept: "complement", belief: "you have to store every number before you can start looking for partners" },
  { id: "memory-is-free", concept: "time-space", belief: "remembering things costs nothing, so there's no trade-off" },
  { id: "counting-is-enough", concept: "matching", belief: "counting opening and closing brackets is enough to check the order" },
  { id: "stack-is-a-queue", concept: "stack", belief: "the oldest open bracket should be closed first" },
  { id: "rescan-is-needed", concept: "matching", belief: "after removing a pair you must start over from the beginning" },
  { id: "sorted-doesnt-help", concept: "sorted-order", belief: "being sorted doesn't tell you anything about the numbers you haven't checked" },
  { id: "halving-off-by-one", concept: "binary-search", belief: "after checking the middle, the middle itself should stay in the search range" },
  { id: "binary-search-is-linear", concept: "binary-search", belief: "halving the range still means looking at most of the numbers" },
  { id: "restart-on-repeat", concept: "sliding-window", belief: "when a character repeats, the only safe move is to start over" },
  { id: "left-moves-back", concept: "sliding-window", belief: "the left edge of the window can move backwards" },
  { id: "need-a-copy", concept: "pointer-rewiring", belief: "you can't reverse a list without building a second one" },
  { id: "lose-the-rest", concept: "pointer-rewiring", belief: "it's safe to change a node's next pointer before saving where it led" },
  { id: "depth-is-node-count", concept: "trees", belief: "a tree's depth is the number of nodes in it" },
  { id: "recursion-needs-levels", concept: "tree-recursion", belief: "to find a tree's depth you have to look at whole levels at once" },
  { id: "no-base-case", concept: "recursion", belief: "a recursive function doesn't need a case that stops it" },
] as const satisfies readonly Misconception[];

export type MisconceptionId = (typeof MISCONCEPTIONS)[number]["id"];
export const misconceptionById = new Map<string, Misconception>(MISCONCEPTIONS.map((m) => [m.id, m]));
