// The placement check's questions: two per teaching week, written by hand.
//   recognition  "which approach fits this problem?" (asked first)
//   explanation  "how does it behave / what does it cost?" (the second chance)
// The first choice in each list is the right one; the screen shuffles them.
import type { ConceptId } from "../knowledge/concepts";

export type Facet = "recognition" | "explanation";

export interface DiagnosticQuestion {
  id: string;
  week: number;
  facet: Facet;
  concepts: ConceptId[];
  prompt: string;
  /** The right answer first. */
  choices: [string, ...string[]];
  /** Why the right answer is right, in one or two sentences. */
  explain: string;
}

export const DIAGNOSTIC: DiagnosticQuestion[] = [
  { id: "w1-r", week: 1, facet: "recognition", concepts: ["hash-set", "hash-lookup"],
    prompt: "Find out whether any value appears twice in a list of n numbers, as fast as possible. What do you reach for?",
    choices: ["A set of the values seen so far", "Compare every pair of values", "Binary search for each value", "A stack of the values"],
    explain: "Asking a set “seen it before?” takes about one step, so one pass is O(n). Comparing every pair is O(n²)." },
  { id: "w1-e", week: 1, facet: "explanation", concepts: ["hash-map", "hash-lookup"],
    prompt: "Looking up a key in a Python dict that holds a million entries takes about how many steps?",
    choices: ["About one", "About 20", "About 500,000", "About a million"],
    explain: "A hash map jumps straight to where the key is stored, so a lookup takes about one step however big it is." },

  { id: "w2-r", week: 2, facet: "recognition", concepts: ["two-pointers", "sorted-order"],
    prompt: "The list is sorted. Find two numbers that add up to a target, using O(1) extra memory. What fits?",
    choices: ["A pointer at each end, moving inwards", "A hash map of the numbers seen", "Check every pair", "A sliding window from the left"],
    explain: "Too small a sum? Move the left pointer right. Too big? Move the right one left. Sorted order makes each move safe, and no extra memory is needed." },
  { id: "w2-e", week: 2, facet: "explanation", concepts: ["two-pointers"],
    prompt: "Two pointers start at the two ends of n items. Each step moves one of them one place inwards. At most how many steps until they meet?",
    choices: ["About n", "About n/2", "About log n", "About n²"],
    explain: "Only one pointer moves per step and the gap between them shrinks by one each time, so it takes about n steps: O(n)." },

  { id: "w3-r", week: 3, facet: "recognition", concepts: ["sliding-window"],
    prompt: "Find the length of the longest substring with no repeated characters. What fits?",
    choices: ["A window that grows on the right and shrinks from the left when a repeat enters", "Sort the characters first", "Binary search on the length", "Check every substring"],
    explain: "A contiguous run that must stay valid is a sliding window: neither edge moves backwards, so it’s O(n). Checking every substring is O(n²) or worse." },
  { id: "w3-e", week: 3, facet: "explanation", concepts: ["prefix-sum"],
    prompt: "prefix[0] = 0 and prefix[i] is the sum of the first i items. Which gives the sum of nums[2] through nums[5]?",
    choices: ["prefix[6] − prefix[2]", "prefix[5] − prefix[2]", "prefix[5] − prefix[1]", "prefix[6] − prefix[1]"],
    explain: "prefix[6] covers nums[0..5] and prefix[2] covers nums[0..1]. Subtracting leaves nums[2..5]." },

  { id: "w4-r", week: 4, facet: "recognition", concepts: ["stack", "matching"],
    prompt: "Check whether a string of brackets like “([]{})” is properly nested. What fits?",
    choices: ["A stack of the open brackets", "Count each kind of bracket", "A queue of the brackets", "Sort the characters"],
    explain: "Each closer must match the most recent opener still open: that’s last in, first out. Counting fails on “([)]”." },
  { id: "w4-e", week: 4, facet: "explanation", concepts: ["monotonic-stack"],
    prompt: "For each of n days, find how many days until a warmer one, using a monotonic stack. How long does it take in total?",
    choices: ["O(n): each day is pushed once and popped at most once", "O(n²): each day scans ahead", "O(n log n): the stack stays sorted", "O(log n)"],
    explain: "Every day enters the stack once and leaves it at most once, so all the pushing and popping adds up to O(n)." },

  { id: "w5-r", week: 5, facet: "recognition", concepts: ["binary-search"],
    prompt: "Find the slowest eating speed that finishes all the bananas within h hours. A faster speed never takes longer. What fits?",
    choices: ["Binary search on the speed", "Try every speed from 1 upwards", "Greedily eat the biggest pile first", "A heap of the piles"],
    explain: "The answer is a number you can test as too slow or fast enough, and the test only flips once. That’s exactly what halving needs." },
  { id: "w5-e", week: 5, facet: "explanation", concepts: ["binary-search"],
    prompt: "Binary search on a sorted list of about a million items needs at most about how many checks?",
    choices: ["About 20", "About 1,000", "About 500,000", "About a million"],
    explain: "Each check halves what’s left, and a million halves to one in about 20 steps: log₂ 1,000,000 ≈ 20." },

  { id: "w6-r", week: 6, facet: "recognition", concepts: ["fast-slow"],
    prompt: "Detect whether a linked list has a cycle, using O(1) extra memory. What fits?",
    choices: ["A slow pointer and a fast pointer", "A set of the nodes visited", "Reverse the list", "Count the nodes"],
    explain: "If there’s a cycle, the fast pointer laps the slow one and they meet. A set works too, but it uses O(n) memory." },
  { id: "w6-e", week: 6, facet: "explanation", concepts: ["pointer-rewiring"],
    prompt: "You’re reversing a linked list, and cur is the current node. What must you do before setting cur.next = prev?",
    choices: ["Save cur.next, or the rest of the list is lost", "Set prev = cur", "Move cur to the next node", "Nothing: the order doesn’t matter"],
    explain: "Once cur.next points backwards, nothing points to the rest of the list. Save it first, then rewire, then move on." },

  { id: "w7-r", week: 7, facet: "recognition", concepts: ["tree-recursion"],
    prompt: "Find a binary tree’s maximum depth. What fits?",
    choices: ["Recursion: 1 + the deeper of the two children", "Sort the node values", "Binary search on the depth", "A hash map of values"],
    explain: "A node’s depth comes from its children’s depths, and the empty tree has depth 0: recursion on trees." },
  { id: "w7-e", week: 7, facet: "explanation", concepts: ["call-stack", "tree-recursion"],
    prompt: "A recursive function visits a tree of n nodes and height h. How much memory does the call stack use?",
    choices: ["O(h): one waiting call per level", "O(1)", "O(log n), whatever the shape", "O(n²)"],
    explain: "At any moment the waiting calls form one path from the root down, so memory grows with the height. That’s log n only when the tree is balanced." },

  { id: "w8-r", week: 8, facet: "recognition", concepts: ["bst"],
    prompt: "Return the k-th smallest value in a binary search tree. What fits?",
    choices: ["An in-order walk, stopping at the k-th node", "Level-by-level search from the root", "Sum the values", "Mirror the tree"],
    explain: "In a binary search tree, an in-order walk (left, node, right) visits values in sorted order, so the k-th visited is the k-th smallest." },
  { id: "w8-e", week: 8, facet: "explanation", concepts: ["trie"],
    prompt: "A trie holds 100,000 words. Checking whether a 6-letter word is in it takes about how many steps?",
    choices: ["About 6", "About 17", "About 100,000", "About 600,000"],
    explain: "A trie follows one child per character, so a lookup takes as many steps as the word has letters, however many words are stored." },

  { id: "w9-r", week: 9, facet: "recognition", concepts: ["heap"],
    prompt: "Keep track of the k largest numbers seen so far in a long stream. What fits?",
    choices: ["A min-heap of size k", "Sort everything after each number", "A stack of the numbers", "A queue of the last k numbers"],
    explain: "The heap’s top is the smallest of the k largest. A new number only gets in if it beats the top, at O(log k) per number." },
  { id: "w9-e", week: 9, facet: "explanation", concepts: ["intervals"],
    prompt: "You’ve sorted intervals by start time and are merging them. When does the next interval overlap the last merged one?",
    choices: ["When its start is at most the last one’s end", "When its end is at most the last one’s start", "When its start is after the last one’s end", "Only when the two are equal"],
    explain: "Sorted by start, the next interval begins no earlier than the last. So it overlaps exactly when it begins before the last one finishes." },

  { id: "w10-r", week: 10, facet: "recognition", concepts: ["backtracking"],
    prompt: "List every subset of a set of n distinct numbers. What fits?",
    choices: ["Backtracking: include or skip each number in turn", "A sliding window", "Binary search", "A greedy choice per number"],
    explain: "Each number is a choice, include or skip. Exploring every choice and undoing it to try the other builds every subset." },
  { id: "w10-e", week: 10, facet: "explanation", concepts: ["backtracking"],
    prompt: "How many subsets does a set of n items have?",
    choices: ["2ⁿ", "n²", "n!", "n log n"],
    explain: "Each item is independently in or out: 2 × 2 × … × 2, n times. So listing them all can’t be faster than 2ⁿ." },

  { id: "w11-r", week: 11, facet: "recognition", concepts: ["graph-traversal", "grid"],
    prompt: "Count the islands of 1s in a grid of 0s and 1s, where an island is 1s connected up, down, left or right. What fits?",
    choices: ["Search (DFS or BFS) from each unvisited 1, marking what you reach", "Sort each row", "Binary search each row", "Running totals of each row"],
    explain: "Cells are nodes and neighbours are edges. Each search marks one whole island, so the number of searches started is the answer." },
  { id: "w11-e", week: 11, facet: "explanation", concepts: ["graph-traversal"],
    prompt: "In a graph whose edges have no weights, which search finds the fewest edges from a start node to every other node?",
    choices: ["Breadth-first search", "Depth-first search", "Either one, always", "Neither of them"],
    explain: "BFS reaches every node at distance 1 before any at distance 2, and so on, so the first time it reaches a node is by a shortest path." },

  { id: "w12-r", week: 12, facet: "recognition", concepts: ["topological-sort"],
    prompt: "Courses have prerequisites. Can every course be finished? What fits?",
    choices: ["Dependency order: it’s impossible exactly when the prerequisites form a cycle", "Dijkstra’s algorithm", "Binary search on the number of courses", "Sort the courses by name"],
    explain: "Taking courses with no remaining prerequisites, one after another, finishes everything unless some courses wait on each other in a cycle." },
  { id: "w12-e", week: 12, facet: "explanation", concepts: ["shortest-path"],
    prompt: "Why does Dijkstra’s algorithm need edge costs that are never negative?",
    choices: ["It finalises the closest node for good; a negative edge found later could make it cheaper", "Heaps can’t store negative numbers", "Negative costs always create cycles", "It doesn’t: negative costs are fine"],
    explain: "Dijkstra assumes nothing found later can beat a node it has already finalised. A negative edge breaks that, which is why Bellman-Ford exists." },

  { id: "w13-r", week: 13, facet: "recognition", concepts: ["dynamic-programming"],
    prompt: "Count the ways to climb n stairs taking 1 or 2 steps at a time. What fits?",
    choices: ["Dynamic programming: ways(n) = ways(n − 1) + ways(n − 2)", "Greedy: always take 2 steps", "Binary search on n", "Sort the possible steps"],
    explain: "Your last move was 1 step or 2, so the ways to reach n are the ways to reach n − 1 plus the ways to reach n − 2, each solved once." },
  { id: "w13-e", week: 13, facet: "explanation", concepts: ["memoization"],
    prompt: "Plain recursion for the n-th Fibonacci number makes about 2ⁿ calls. Remembering each answer the first time, how many distinct calls are left?",
    choices: ["About n", "About n²", "Still about 2ⁿ", "About log n"],
    explain: "There are only n different arguments, and each is computed once; every repeat is a lookup." },

  { id: "w14-r", week: 14, facet: "recognition", concepts: ["dp-2d"],
    prompt: "Find the length of the longest common subsequence of two strings. What fits?",
    choices: ["Two-dimensional DP over prefixes of both strings", "A sliding window over one string", "Two pointers, matching greedily", "Sort both strings"],
    explain: "The answer for the first i letters of one and the first j of the other comes from smaller pairs of prefixes: dp[i][j]." },
  { id: "w14-e", week: 14, facet: "explanation", concepts: ["knapsack"],
    prompt: "Coin change with unlimited coins of each kind, using a one-row table dp[amount]. Which way do you loop over the amounts for each coin?",
    choices: ["Upwards, so the same coin can be used again", "Downwards, so each coin is used once", "It doesn’t matter", "From the largest coin’s value only"],
    explain: "Going upwards, dp[a − coin] may already include this coin, which is exactly what unlimited reuse needs. Downwards is the 0/1 version." },

  { id: "w15-r", week: 15, facet: "recognition", concepts: ["bit-manipulation"],
    prompt: "Every number appears twice except one. Find it in O(n) time and O(1) memory. What fits?",
    choices: ["XOR all the numbers together", "A hash map of counts", "Sort, then compare neighbours", "Binary search"],
    explain: "x ^ x = 0 and x ^ 0 = x, so every pair cancels and the single number is left. A hash map needs O(n) memory and sorting needs O(n log n) time." },
  { id: "w15-e", week: 15, facet: "explanation", concepts: ["greedy"],
    prompt: "Jump Game: each value says how far you can jump from there. Why is tracking the furthest reachable index enough?",
    choices: ["Every index up to the furthest reachable one is reachable too, so no better path is ever lost", "Because the values are sorted", "Because it tries every path", "It isn’t: it can miss some paths"],
    explain: "If you can reach index r, you can reach every index before it, so the furthest point says everything. That’s the proof a greedy choice needs." },
];
