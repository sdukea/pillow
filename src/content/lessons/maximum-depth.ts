import type { Lesson } from "../lesson";

export const maximumDepth: Lesson = {
  card: {
    slow: "Count the levels one at a time, with a queue.",
    waste: "The queue holds a whole level of nodes at once.",
    trick: "A tree’s depth is 1 + the deeper of its two subtrees.",
    recognize: "A node’s answer built from its children’s answers? Recurse.",
  },
  reasoning: [
    {
      "ask": "The left subtree is 2 deep and the right subtree is 1 deep. How deep is the whole tree?",
      "concepts": [
        "tree-recursion",
        "trees"
      ],
      "choices": [
        {
          "text": "3: one for the root, plus the deeper side.",
          "correct": true,
          "reply": "Right. The longest path goes through the root and down the deeper side."
        },
        {
          "text": "4: the root plus both sides.",
          "misconception": "depth-is-node-count",
          "reply": "Depth follows one path down, not both sides. Adding them counts nodes on two different paths."
        },
        {
          "text": "2: just the deeper side.",
          "reply": "Don’t forget the root itself: it’s on every path."
        }
      ],
      "hints": [
        "Depth is the number of nodes on the longest path from the root down.",
        "A path goes down one side only."
      ]
    },
    {
      "ask": "A tree’s depth comes from its subtrees’ depths. Where does that stop?",
      "concepts": [
        "recursion"
      ],
      "choices": [
        {
          "text": "At an empty tree, whose depth is 0.",
          "correct": true,
          "reply": "Yes. That’s the base case: the one answer you know without asking anyone."
        },
        {
          "text": "It doesn’t need to stop: just keep going down.",
          "misconception": "no-base-case",
          "reply": "Then the calls would never end. Every recursion needs a case it can answer directly."
        },
        {
          "text": "When you’ve visited a whole level.",
          "misconception": "recursion-needs-levels",
          "reply": "Recursion doesn’t need levels: each call only asks its own two children."
        }
      ],
      "hints": [
        "What’s the depth of a tree with no nodes at all?",
        "Every recursion needs one case it can answer without recursing."
      ]
    }
  ],
  understand: {
    statement: "You get the root of a binary tree. Return its **depth**: the number of nodes on the longest path from the root down to a leaf.",
    inputs: [{ name: "root", meaning: "The top node of the tree, or `None` for an empty tree. Each node has a value (`val`) and up to two children (`left` and `right`)." }],
    output: "A number: how many levels the tree has.",
    walkthrough: [
      "Take the tree `[3, 9, 20, null, null, 15, 7]`: 3 at the top, 9 and 20 below it, and 15 and 7 below 20.",
      "The path 3 → 9 has 2 nodes. The paths 3 → 20 → 15 and 3 → 20 → 7 have 3.",
      "The longest has 3 nodes, so the depth is 3.",
    ],
    constraints: [
      "An empty tree (`root` is `None`) has depth 0.",
      "A single node has depth 1.",
      "The tree doesn’t have to be balanced. One side can be much deeper than the other.",
      "On LeetCode, a tree can have up to 10,000 nodes.",
    ],
    testing: "Whether you can describe a tree in terms of smaller trees, and choose between visiting it level by level or by asking each side for its answer.",
    check: {
      question: "A tree is a single straight line: 1 → 2 → 3 → 4, each node with only a left child. What’s its depth?",
      options: ["4", "1", "2", "3"],
      answer: 0,
      explain: "The only path from the root to a leaf passes through all four nodes, so the depth is 4. A tree like this is “lopsided”, and it matters for memory later.",
    },
  },

  approaches: {
    "level-by-level": {
      concepts: ["trees", "queue", "bfs"],
      headline: "Count the levels, one at a time",
      intuition: "Visit the tree one level at a time, using a queue that holds the next level. Each time you finish a level, add one to the depth.",
      discovery: "Depth is literally “how many levels”, so the natural first idea is to walk the levels and count them. A queue keeps the nodes in level order: first in, first out.",
      steps: [
        "If the tree is empty, return 0.",
        "Put the root in a queue. That’s the first level.",
        "While the queue isn’t empty: count a level, then take out exactly the nodes on that level, queueing each one’s children.",
        "Return the number of levels counted.",
      ],
      notes: {
        2: { what: "Checks for an empty tree.", why: "An empty tree has no levels; the rest of the code assumes there’s a root.", ifRemoved: "Line 5 would put `None` in the queue, and line 10 would crash reading `None.left`." },
        3: { what: "Returns 0 for an empty tree.", why: "No nodes means no levels.", ifRemoved: "Without the early return, the code below would try to process `None`." },
        4: { what: "Starts the level count at 0.", why: "Each pass of the loop will add one.", affects: "`depth`", ifRemoved: "Line 7 would have no `depth` to add to." },
        5: { what: "Puts the root in a queue.", why: "On its own, the root is the whole first level.", affects: "`queue`", ifRemoved: "There’d be nothing to visit." },
        6: { what: "Keeps going while there’s a level waiting.", why: "An empty queue means the last level had no children.", ifRemoved: "Nothing would be visited." },
        7: { what: "Counts this level.", why: "Each pass of the outer loop handles exactly one level.", affects: "`depth`", ifRemoved: "Every level would be visited but never counted." },
        8: { what: "Repeats once for each node on this level.", why: "`len(queue)` is measured **before** any children are added, so the loop handles this level and no more.", ifRemoved: "Writing `while queue` here instead would also take the children, mixing levels together, and count only one level." },
        9: { what: "Takes the next node from the front of the queue.", why: "The front holds the oldest node, so levels come out in order.", affects: "`node` and `queue`", ifRemoved: "Using `queue.pop()` instead would take from the back and mix up the levels." },
        10: { what: "Checks for a left child.", why: "Only real children belong on the next level.", ifRemoved: "Without the check, `None` would be queued and later crash on `None.left`." },
        11: { what: "Queues the left child for the next level.", why: "Its own children are one level further down.", affects: "`queue`", ifRemoved: "Left subtrees would never be visited, and deep left branches wouldn’t be counted." },
        12: { what: "Checks for a right child.", why: "Same as the left side.", ifRemoved: "`None` would be queued and later crash." },
        13: { what: "Queues the right child for the next level.", why: "Same as the left side.", affects: "`queue`", ifRemoved: "Right subtrees would never be visited." },
        14: { what: "Returns the number of levels counted.", why: "The queue emptied after the deepest level.", ifRemoved: "Python would return `None`." },
      },
      complexity: {
        time: "n",
        space: "n",
        spaceLabel: "O(w)",
        counted: "every line Python runs",
        timeWhy: "Every node is queued once and taken out once, so the work grows in step with the number of nodes.",
        spaceWhy: "The queue holds one level at a time, so memory grows with the widest level, w. For a full tree that’s about half the nodes (n/2), which is why it was measured as O(n) here.",
      },
      whyNotEnough: "It’s correct and as fast as possible: every node must be visited once. The cost is machinery. It needs a queue, a level counter and a careful inner loop, and its memory grows with the tree’s widest level, which is huge for a full tree.",
      check: {
        question: "Why does the inner loop run len(queue) times, measured before the loop starts?",
        options: ["So it takes this level’s nodes and none of the children it adds", "Because deque needs it", "To make it faster", "To skip empty levels"],
        answer: 0,
        explain: "While handling a level, children are appended to the same queue. Fixing the count at the start means only this level’s nodes are taken; the children wait for the next pass.",
      },
    },

    recursion: {
      concepts: ["tree-recursion", "call-stack", "space-complexity"],
      headline: "Ask each side how deep it is",
      intuition: "A tree’s depth is one (for the root) plus the deeper of its two sides. Each side is itself a smaller tree, so ask it the same question. An empty tree is 0 deep.",
      discovery: "Look at the level-by-level approach and ask what you actually need from each part of the tree: just one number, its depth. The root doesn’t need levels; it needs its two children’s answers.",
      steps: [
        "If the node is empty, its depth is 0.",
        "Otherwise, find the depth of the left side, then the right side, by asking the same question of each child.",
        "Return 1 + the larger of the two.",
      ],
      insight: {
        inefficiency: "Not speed: both visit every node once. The level-by-level approach carries machinery it doesn’t need: a queue, a level counter and a careful inner loop.",
        repeatedWork: "It tracks every node on a level at once, when each node only needs its own children’s answers.",
        observation: "A tree is a root with two smaller trees under it. So depth(tree) = 1 + max(depth(left), depth(right)), and the depth of an empty tree is 0.",
        technique: "Recursion: a function that solves the problem by calling itself on smaller versions of it, with a base case that needs no further calls.",
        whyItWorks: "Every call either hits the base case (an empty tree, 0) or works on a strictly smaller tree, so the calls always finish. Each call trusts its two children’s answers and adds one for itself.",
        tradeoffs: "Each call waits on the call stack until its children answer, so memory grows with the height h: about log n for a balanced tree, but up to n for a lopsided one. Python stops recursion at about 1,000 nested calls by default, so a straight-line tree of 5,000 nodes would crash it, while level by level wouldn’t.",
      },
      notes: {
        2: { what: "Checks whether this spot in the tree is empty.", why: "It’s the base case: the one question we can answer without asking anyone else.", ifRemoved: "The function would call itself on `None` forever, until Python stops it, and crash reading `None.left`." },
        3: { what: "Returns 0 for an empty tree.", why: "There are no nodes on any path, so the depth is 0. This is where the recursion stops.", ifRemoved: "Returning 1 here instead would count every empty spot as a level, and each answer would come out one too high." },
        4: { what: "Asks the left child how deep it is, and waits for the answer.", why: "The left side is a smaller tree, so the same function answers it.", affects: "`left`", ifRemoved: "Only the right side would count, so deep left branches would be missed." },
        5: { what: "Asks the right child how deep it is.", why: "Same question, other side.", affects: "`right`", ifRemoved: "Only the left side would count, and deep right branches would be missed." },
        6: { what: "Returns 1 for this node plus the deeper side.", why: "The longest path through this node goes down whichever side is deeper.", ifRemoved: "Returning `left + right` instead would count nodes on both sides, which is a different quantity." },
      },
      complexity: {
        time: "n",
        space: "log n",
        spaceLabel: "O(h)",
        counted: "every line Python runs",
        timeWhy: "Each node is visited by exactly one call, and each call does a fixed amount of work besides waiting for its children. Double the nodes, double the work.",
        spaceWhy: "Calls wait on the call stack until their children answer, so memory grows with the tree’s height h. On the balanced trees measured here that’s about log n; a lopsided tree reaches n.",
      },
      check: {
        question: "What would happen without the base case on lines 2–3?",
        options: ["It would call itself on None forever and crash", "It would return 0 every time", "It would visit nodes twice", "Nothing; it’s optional"],
        answer: 0,
        explain: "Without a base case, the calls never stop: an empty spot would call `max_depth(None.left)`, which fails. Every recursion needs at least one case it answers directly.",
      },
    },
  },

  compare: {
    tradeoffs: "Both visit every node once (O(n) time). They differ in memory: level by level holds the widest level, which is about n/2 for a full tree, while recursion holds one call per level of height, about log n for a balanced tree but up to n for a lopsided one. Recursion is shorter and clearer; level by level never hits Python’s recursion limit.",
    takeaways: [
      "Many tree problems become one line once you describe the tree as a root plus two smaller trees.",
      "Every recursion needs a base case, usually “the tree is empty”.",
      "Recursion isn’t free: the call stack uses memory in proportion to the height.",
    ],
    pattern: {
      name: "Recursion on trees (depth-first)",
      recognize: "The answer for a node can be built from its children’s answers: height, size, sum, whether it’s balanced, whether two trees match.",
      alsoUsedIn: ["Same Tree", "Invert Binary Tree", "Diameter of Binary Tree", "Balanced Binary Tree"],
    },
  },

  growth: {
    // Complete trees: the widest levels for the queue, and the balanced height for recursion.
    sizes: [7, 15, 31, 63, 127],
    spaceSizes: [7, 15, 31, 63, 127],
    input: (n) => [{ kind: "tree", values: Array.from({ length: n }, (_, i) => i + 1) }],
    describe: "a complete tree of n nodes, with every level full",
  },

  edgeCases: [
    [{ kind: "tree", values: [] }],
    [{ kind: "tree", values: [1] }],
    [{ kind: "tree", values: [1, 2, null, 3] }],
  ],
};
