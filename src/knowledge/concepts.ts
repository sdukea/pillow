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
  /** The facts worth keeping: how it works and what it costs. Shown on the concept's reference card. */
  facts: string[];
  /** When to reach for it. */
  useWhen: string;
}

export const CONCEPTS = [
  { id: "arrays", name: "Arrays", means: "A list of values you reach by index.", requires: [], facts: ["Reading or writing nums[i] takes one step.", "Inserting or deleting in the middle shifts everything after it: up to n steps.", "Indexes start at 0, so the last one is len(nums) − 1."], useWhen: "You need items in order, by position." },
  { id: "loops", name: "Loops", means: "Visit each item in turn.", requires: ["arrays"], facts: ["A loop over n items runs its body n times.", "Know what changes each time round, and when it stops."], useWhen: "You must look at every item at least once." },
  { id: "strings", name: "Strings", means: "Text is a sequence of characters, like an array.", requires: ["arrays"], facts: ["s[i] is one character, and len(s) is how many there are.", "Strings can’t change in place: list(s) gives a copy you can edit.", "A substring is a contiguous run: no skipping."], useWhen: "The input is text." },
  { id: "nested-loops", name: "Every pair", means: "A loop inside a loop visits every pair of items.", requires: ["loops"], facts: ["A loop inside a loop checks every pair: about n²/2 of them.", "Double the input and the work roughly quadruples."], useWhen: "As a first, correct idea. Then look for what it repeats." },
  { id: "complexity", name: "Growth of work", means: "How the number of steps grows as the input grows.", requires: ["loops"], facts: ["Count how the steps grow as the input grows, not the exact number.", "O(1) stays flat; O(log n) adds one step when n doubles; O(n) doubles; O(n²) quadruples.", "Interviewers expect you to state it, and to say why."], useWhen: "Comparing two approaches. Always." },
  { id: "space-complexity", name: "Growth of memory", means: "How much a solution holds at once as the input grows.", requires: ["complexity"], facts: ["Count what a solution holds at once, beyond the input.", "Recursion uses memory too: one waiting call per level."], useWhen: "Deciding whether extra memory is worth the speed." },
  { id: "invariant", name: "Invariants", means: "Something that stays true every time around a loop.", requires: ["loops"], facts: ["An invariant is true before the loop, stays true each time round, and gives the answer at the end.", "Stating it is how you show a loop is correct."], useWhen: "A loop keeps boundaries or a window that must stay valid." },
  { id: "hash-map", name: "Hash maps", means: "Store values under keys and find them by key.", requires: ["arrays"], facts: ["Stores key → value pairs.", "Adding, finding and removing a key take about one step on average.", "Keys must be hashable: numbers, strings, tuples."], useWhen: "You’ll need to find something by its value later." },
  { id: "hash-set", name: "Sets", means: "Remember which values you've seen.", requires: ["hash-map"], facts: ["Stores values only, each at most once.", "Checking “is x in the set?” takes about one step."], useWhen: "You only need to know whether you’ve seen something." },
  { id: "hash-lookup", name: "Instant lookup", means: "Checking a hash map or set takes about one step, however big it is.", requires: ["hash-map", "complexity"], facts: ["Looking up a key in a hash map or set takes about one step, however big it is.", "Looking something up in a list scans it: up to n steps."], useWhen: "A loop would otherwise search through what you’ve already seen." },
  { id: "complement", name: "Look for what you need", means: "Instead of trying partners, compute the one you need and look it up.", requires: ["hash-lookup"], facts: ["For a target sum, each x needs exactly target − x.", "Look up that complement instead of trying every partner."], useWhen: "You’re looking for pairs that combine to a target." },
  { id: "time-space", name: "Memory for speed", means: "Store something now to avoid repeating work later.", requires: ["space-complexity", "hash-map"], facts: ["Storing work you’ve done lets you skip repeating it.", "It often turns O(n²) into O(n), at the cost of O(n) memory."], useWhen: "The slow way keeps re-searching or recomputing the same things." },
  { id: "sorted-order", name: "Sorted order", means: "In sorted data, one comparison tells you about everything on one side.", requires: ["arrays"], facts: ["In sorted data, one comparison tells you about everything on one side.", "Sorting first costs O(n log n)."], useWhen: "The input is sorted, or sorting it first pays off." },
  { id: "binary-search", name: "Halving", means: "Rule out half of what's left with every check.", requires: ["sorted-order", "complexity", "invariant"], facts: ["Check the middle; throw away the half that can’t hold the target.", "About log₂ n checks: 20 for a million items.", "Keep lo ≤ hi, and always move past mid (mid + 1 or mid − 1)."], useWhen: "The data is sorted, or the answer is a number you can test as too small or too big." },
  { id: "two-pointers", name: "Two pointers", means: "Two indices that move through the data, each only forward.", requires: ["loops"], facts: ["Two indexes that each only move forward, or towards each other.", "Each moves at most n times, so the total work is O(n)."], useWhen: "Comparing or pairing items in order, or keeping a range." },
  { id: "sliding-window", name: "Sliding window", means: "Keep a valid window and slide its edges instead of starting over.", requires: ["two-pointers", "hash-map", "invariant"], facts: ["Grow the window on the right; shrink it from the left when it breaks the rule.", "Neither edge moves backwards, so it’s O(n) in total.", "Track what’s inside with a map or a set."], useWhen: "The question asks for the longest, shortest or best contiguous run." },
  { id: "stack", name: "Stacks", means: "Last in, first out: you only touch the top.", requires: ["arrays"], facts: ["Push and pop at the top, one step each.", "In Python, a list: append to push, pop() to pop, stack[-1] to peek.", "Check it isn’t empty before you peek or pop."], useWhen: "The most recent thing must be handled first." },
  { id: "matching", name: "Matching pairs", means: "The most recent opening is the next one to close.", requires: ["stack"], facts: ["Each closer must match the most recent opener still open.", "Push openers; on a closer, the top must match, then pop it.", "It’s valid only if the stack is empty at the end."], useWhen: "Things open and close and must nest: brackets, tags, function calls." },
  { id: "queue", name: "Queues", means: "First in, first out: take from the front, add to the back.", requires: ["arrays"], facts: ["Add at the back, take from the front, one step each.", "In Python, collections.deque: append and popleft.", "A list’s pop(0) is slow: it shifts everything."], useWhen: "Things must be handled in the order they arrived." },
  { id: "linked-list", name: "Linked lists", means: "Nodes that each point to the next one.", requires: [], facts: ["Each node holds a value and a pointer to the next node.", "Reaching the k-th node takes k steps: there’s no indexing.", "Inserting or removing after a node you’re holding takes one step."], useWhen: "The input is given as nodes." },
  { id: "pointer-rewiring", name: "Rewiring links", means: "Change where nodes point, without losing the rest of the list.", requires: ["linked-list", "two-pointers"], facts: ["Save next before you change it, or the rest of the list is lost.", "Track prev, cur and next, and move all three forward together."], useWhen: "Reversing, reordering or splicing a list in place." },
  { id: "trees", name: "Binary trees", means: "Each node has up to two children.", requires: ["linked-list"], facts: ["Each node has up to two children: left and right.", "Depth is the number of nodes on the longest path from the root down.", "A tree of n nodes can be n deep (a line) or about log₂ n deep (balanced)."], useWhen: "The input is a tree." },
  { id: "bfs", name: "Level by level", means: "Visit a tree one level at a time, using a queue.", requires: ["trees", "queue"], facts: ["Visit level by level, using a queue.", "Handle exactly len(queue) nodes per level to keep levels apart.", "Memory grows with the widest level."], useWhen: "You need levels, or the fewest steps to reach something." },
  { id: "recursion", name: "Recursion", means: "Solve a problem using the answer to a smaller version of it.", requires: ["loops"], facts: ["A function calls itself on a smaller input.", "Every recursion needs a base case it answers directly.", "Trust the smaller call’s answer, and build yours from it."], useWhen: "The answer for the whole is built from answers for its parts." },
  { id: "call-stack", name: "The call stack", means: "Each waiting call is remembered until its answer comes back.", requires: ["recursion", "stack"], facts: ["Each call waits on the stack until its own calls return.", "Memory grows with how deep the calls go.", "Python stops at about 1,000 nested calls by default."], useWhen: "Working out recursion’s memory, or why it crashed." },
  { id: "tree-recursion", name: "Recursion on trees", means: "A node's answer is built from its children's answers.", requires: ["recursion", "trees"], facts: ["A node’s answer comes from its children’s answers.", "The empty tree is the base case.", "Usually O(n) time and O(h) memory, where h is the height."], useWhen: "Height, size, sums, balance, comparing trees." },
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
