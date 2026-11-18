// The concepts Pillow maps a student's understanding onto, and how they depend on each other.
// Hand-curated on purpose: the knowledge map is only as meaningful as this ontology. Problems
// (through their approaches) are tagged with the concepts they exercise; the build checks every
// tag exists and that prerequisites form no cycles.

export interface Concept {
  id: string;
  name: string;
  /** One line: what understanding this concept means. */
  means: string;
  requires: string[];
}

export const CONCEPTS = [
  { id: "arrays", name: "Arrays", means: "A list of values you reach by index.", requires: [] },
  { id: "loops", name: "Loops", means: "Visit each item in turn.", requires: ["arrays"] },
  { id: "strings", name: "Strings", means: "Text is a sequence of characters, like an array.", requires: ["arrays"] },
  { id: "nested-loops", name: "Every pair", means: "A loop inside a loop visits every pair of items.", requires: ["loops"] },
  { id: "complexity", name: "Growth of work", means: "How the number of steps grows as the input grows.", requires: ["loops"] },
  { id: "space-complexity", name: "Growth of memory", means: "How much a solution holds at once as the input grows.", requires: ["complexity"] },
  { id: "invariant", name: "Invariants", means: "Something that stays true every time around a loop.", requires: ["loops"] },
  { id: "hash-map", name: "Hash maps", means: "Store values under keys and find them by key.", requires: ["arrays"] },
  { id: "hash-set", name: "Sets", means: "Remember which values you've seen.", requires: ["hash-map"] },
  { id: "hash-lookup", name: "Instant lookup", means: "Checking a hash map or set takes about one step, however big it is.", requires: ["hash-map", "complexity"] },
  { id: "complement", name: "Look for what you need", means: "Instead of trying partners, compute the one you need and look it up.", requires: ["hash-lookup"] },
  { id: "time-space", name: "Memory for speed", means: "Store something now to avoid repeating work later.", requires: ["space-complexity", "hash-map"] },
  { id: "sorted-order", name: "Sorted order", means: "In sorted data, one comparison tells you about everything on one side.", requires: ["arrays"] },
  { id: "binary-search", name: "Halving", means: "Rule out half of what's left with every check.", requires: ["sorted-order", "complexity", "invariant"] },
  { id: "two-pointers", name: "Two pointers", means: "Two indices that move through the data, each only forward.", requires: ["loops"] },
  { id: "sliding-window", name: "Sliding window", means: "Keep a valid window and slide its edges instead of starting over.", requires: ["two-pointers", "hash-map", "invariant"] },
  { id: "stack", name: "Stacks", means: "Last in, first out: you only touch the top.", requires: ["arrays"] },
  { id: "matching", name: "Matching pairs", means: "The most recent opening is the next one to close.", requires: ["stack"] },
  { id: "queue", name: "Queues", means: "First in, first out: take from the front, add to the back.", requires: ["arrays"] },
  { id: "linked-list", name: "Linked lists", means: "Nodes that each point to the next one.", requires: [] },
  { id: "pointer-rewiring", name: "Rewiring links", means: "Change where nodes point, without losing the rest of the list.", requires: ["linked-list", "two-pointers"] },
  { id: "trees", name: "Binary trees", means: "Each node has up to two children.", requires: ["linked-list"] },
  { id: "bfs", name: "Level by level", means: "Visit a tree one level at a time, using a queue.", requires: ["trees", "queue"] },
  { id: "recursion", name: "Recursion", means: "Solve a problem using the answer to a smaller version of it.", requires: ["loops"] },
  { id: "call-stack", name: "The call stack", means: "Each waiting call is remembered until its answer comes back.", requires: ["recursion", "stack"] },
  { id: "tree-recursion", name: "Recursion on trees", means: "A node's answer is built from its children's answers.", requires: ["recursion", "trees"] },
] as const satisfies readonly Concept[];

export type ConceptId = (typeof CONCEPTS)[number]["id"];

export const conceptById = new Map<string, Concept>(CONCEPTS.map((c) => [c.id, c]));

/** Depth in the prerequisite graph: 0 for concepts with no prerequisites. */
export function depthOf(id: string, seen = new Set<string>()): number {
  if (seen.has(id)) throw new Error(`prerequisite cycle through ${id}`);
  const c = conceptById.get(id);
  if (!c || c.requires.length === 0) return 0;
  return 1 + Math.max(...c.requires.map((r) => depthOf(r, new Set([...seen, id]))));
}
