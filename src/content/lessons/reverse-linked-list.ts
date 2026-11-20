import type { Lesson } from "../lesson";

export const reverseLinkedList: Lesson = {
  card: {
    slow: "Copy the values, then build a new list backwards.",
    waste: "It builds a whole second list just to throw the first away.",
    trick: "Walk the list once, turning each arrow around as you go.",
    recognize: "Rewiring a linked list? Track prev, cur and next.",
  },
  reasoning: [
    {
      "ask": "To turn 1 → 2 → 3 around, what has to change about each node?",
      "concepts": [
        "pointer-rewiring"
      ],
      "choices": [
        {
          "text": "Where its arrow points: from the next node to the one before.",
          "correct": true,
          "reply": "Yes. The nodes stay where they are; only the arrows flip."
        },
        {
          "text": "Its value: write the values back in reverse order.",
          "reply": "That rewrites values instead of turning the list around, and values can be big objects you shouldn’t copy around."
        },
        {
          "text": "Nothing: you have to build a new list.",
          "misconception": "need-a-copy",
          "reply": "You can reuse the same nodes. Just make each arrow point backwards."
        }
      ],
      "hints": [
        "In 3 → 2 → 1, where does node 2’s arrow point?",
        "Each node’s next should become the node before it."
      ]
    },
    {
      "ask": "You’re at node 2, about to point it back at node 1. What must you do first?",
      "concepts": [
        "two-pointers",
        "pointer-rewiring"
      ],
      "choices": [
        {
          "text": "Save where node 2 points now, so you can still reach node 3.",
          "correct": true,
          "reply": "Exactly. Flip first and the rest of the list is lost. That’s why there are three pointers: prev, cur and next."
        },
        {
          "text": "Nothing: just flip the arrow.",
          "misconception": "lose-the-rest",
          "reply": "Then node 3 is unreachable: its only link was node 2’s arrow."
        },
        {
          "text": "Copy the rest of the list somewhere safe.",
          "misconception": "need-a-copy",
          "reply": "Saving one pointer is enough. There’s no need to copy anything."
        }
      ],
      "hints": [
        "After the flip, node 2 points at node 1. How would you reach node 3?",
        "Note the next node before you change anything."
      ]
    }
  ],
  understand: {
    statement: "You get the first node of a linked list. Reverse the list, so the last node comes first, and return the new first node.",
    inputs: [
      { name: "head", meaning: "The first node of the list. Each node holds a value (`val`) and a pointer to the next node (`next`). The last node’s `next` is `None`." },
    ],
    output: "The first node of the reversed list. For `1 → 2 → 3 → 4`, that’s the node holding 4, now followed by 3, 2 and 1.",
    walkthrough: [
      "Start with `1 → 2 → 3 → 4 → None`.",
      "Reversing means every arrow points the other way: `None ← 1 ← 2 ← 3 ← 4`.",
      "Node 1 now points at nothing (it’s the new end), and node 4 is the new start.",
      "So return the node holding 4.",
    ],
    constraints: [
      "The list can be empty, when `head` is `None`. Then return `None`.",
      "On LeetCode, a list has up to 5,000 nodes.",
      "There are no indices. The only way to reach a node is to follow `next` pointers from the head.",
    ],
    testing: "Whether you can change pointers without losing track of the rest of the list. One careless line and everything after it is gone.",
    check: {
      question: "After reversing 1 → 2 → 3, what does node 1’s next point to?",
      options: ["None", "Node 2", "Node 3", "Node 1 itself"],
      answer: 0,
      explain: "Node 1 was the first node, so after reversing it’s the last one, and the last node always points at `None`.",
    },
  },

  approaches: {
    "copy": {
      concepts: ["linked-list", "space-complexity"],
      headline: "Copy it out, build it backwards",
      intuition: "Read every value into a Python list, then build a brand-new linked list from those values. Adding each new node to the **front** puts the first value at the back.",
      discovery: "It’s what you’d do with any sequence you need backwards: copy it somewhere you can work with it easily. It sidesteps pointer juggling completely, which makes it a safe first answer.",
      steps: [
        "Walk the list from the head and copy each value into a Python list.",
        "Start a new, empty list.",
        "For each copied value, in order, create a node for it in front of the new list.",
        "Return the new list’s first node.",
      ],
      notes: {
        2: { what: "Creates an empty Python list to copy the values into.", why: "It’s somewhere to hold every value while we read through the linked list.", affects: "`values`", ifRemoved: "Line 5 would have nowhere to put the values." },
        3: { what: "Starts reading at the head.", why: "A linked list can only be read from the front, following `next` pointers.", affects: "`node`", ifRemoved: "There’d be no way into the list." },
        4: { what: "Keeps reading while there’s a node.", why: "When `node` becomes `None`, we’ve passed the last node.", ifRemoved: "Writing `while node.next` instead would stop before the last node and lose its value." },
        5: { what: "Copies the current node’s value into the list.", why: "These copies are what the new list will be built from.", affects: "`values`", ifRemoved: "Nothing would be copied, and the new list would be empty." },
        6: { what: "Moves on to the next node.", why: "Following `next` is the only way to reach the rest of the list.", affects: "`node`", ifRemoved: "`node` would never change, so the loop would run forever." },
        7: { what: "Starts the new list empty.", why: "The first value we place will become the new list’s last node, and a last node points at `None`.", affects: "`new_head`", ifRemoved: "Line 9 would have no list to put the first node in front of." },
        8: { what: "Goes through the copied values from first to last.", why: "Putting each one in front means the first value ends up at the back, which is exactly the reversal.", affects: "`v`", ifRemoved: "Going through `reversed(values)` instead, while still adding to the front, would rebuild the original order." },
        9: { what: "Creates a new node for `v`, pointing at the current front of the new list.", why: "Adding to the front is the step that reverses the order.", affects: "`new_head`, plus one new node", ifRemoved: "No nodes would be created, and the result would be empty." },
        10: { what: "Returns the first node of the new list.", why: "The last value we placed is now at the front.", ifRemoved: "Returning `head` would hand back the original list, which still runs in the old order." },
      },
      complexity: {
        time: "n",
        space: "n",
        counted: "every line Python runs",
        timeWhy: "Two passes: one to copy the n values out, one to build n new nodes. Each node costs a fixed number of steps, so double the list, double the work.",
        spaceWhy: "It holds a copy of all n values, and then creates n brand-new nodes as well.",
      },
      whyNotEnough: "Its time is already as good as it gets: you have to visit every node at least once. The cost is memory, with a full copy of the values and n new nodes. It also doesn’t reverse the list you were given; it builds a different one beside it.",
      check: {
        question: "Why does the new list come out reversed?",
        options: ["Each new node is added to the front", "The values are read from the back", "Python lists reverse themselves", "The loop runs backwards"],
        answer: 0,
        explain: "Values are read front to back, but each new node goes in front of the ones already built. The first value read ends up at the very back.",
      },
    },

    "in-place": {
      concepts: ["pointer-rewiring", "two-pointers"],
      headline: "Flip each pointer as you walk",
      intuition: "The nodes are already all there; they just point the wrong way. Walk the list once and turn each `next` pointer around as you pass it.",
      discovery: "Look at what the copy approach throws away: four perfectly good nodes, which it replaces with four new ones holding the same values. The only thing that needed changing was which way each arrow points.",
      steps: [
        "Keep `prev` (the reversed part so far, starting empty) and `cur` (the node you’re about to flip, starting at the head).",
        "Save what comes after `cur` in `nxt`, before you break that link.",
        "Point `cur` back at `prev`.",
        "Move `prev` up to `cur` and `cur` on to `nxt`. Repeat until `cur` is `None`, then return `prev`.",
      ],
      insight: {
        inefficiency: "Copying. The copy approach stores every value and allocates n new nodes it doesn’t need.",
        repeatedWork: "It recreates what already exists: the original nodes hold exactly the right values, so building new ones is wasted effort and memory.",
        observation: "Reversing a list only means flipping each `next` pointer. If we flip them one at a time as we walk, we never need a copy.",
        technique: "Three pointers: `prev` (the head of the part already reversed), `cur` (the node being flipped) and `nxt` (the rest of the list, saved before its link is broken).",
        whyItWorks: "At every moment, `prev` leads a correctly reversed list and `nxt` leads the untouched rest. Each step moves exactly one node from the untouched part to the reversed part, so when nothing is left untouched, `prev` is the whole reversed list.",
        tradeoffs: "It changes the list it was given. If other code still needs the original order, copying is the safer choice despite the extra memory.",
      },
      notes: {
        2: { what: "`prev` will lead the part of the list that’s already reversed. It starts empty.", why: "The first node becomes the new tail, and a tail points at nothing.", affects: "`prev`", ifRemoved: "Line 6 would have nothing to point the first node at." },
        3: { what: "`cur` is the node we’re about to flip. It starts at the head.", why: "We reverse from front to back, one node at a time.", affects: "`cur`", ifRemoved: "There’d be no way into the list." },
        4: { what: "Keeps going while there’s a node left to flip.", why: "When `cur` becomes `None`, every node has been flipped.", ifRemoved: "Writing `while cur.next` instead would stop one node early and leave the last node unflipped." },
        5: { what: "Saves the rest of the list in `nxt`.", why: "The next line overwrites `cur.next`. Without saving it first, everything after `cur` would be lost.", affects: "`nxt`", ifRemoved: "After line 6, the rest of the list would be unreachable, and the loop would stop after one node." },
        6: { what: "Points the current node backwards, at `prev`.", why: "This is the reversal itself. Every other line just keeps track of where we are.", affects: "`cur.next`", ifRemoved: "Nothing would be reversed; the loop would just walk the list." },
        7: { what: "The reversed part now starts at `cur`.", why: "On the next pass, the next node should point back at this one.", affects: "`prev`", ifRemoved: "Every node would point back at `None`, and the list would fall apart into single nodes." },
        8: { what: "Moves on to the saved rest of the list.", why: "That’s the next node waiting to be flipped.", affects: "`cur`", ifRemoved: "`cur` would never move, so the loop would never end." },
        9: { what: "Returns `prev`, the new head.", why: "When the loop ends, `cur` is `None` and `prev` is the last node we flipped: the old tail, now the head.", ifRemoved: "Returning `head` instead would return the old first node, which is now the tail with nothing after it." },
      },
      complexity: {
        time: "n",
        space: "1",
        counted: "every line Python runs",
        timeWhy: "One pass, and each node takes the same four steps (save, flip, move, move). Double the list, double the work.",
        spaceWhy: "Just three pointers, `prev`, `cur` and `nxt`, however long the list is. No values are copied and no nodes are created.",
      },
      check: {
        question: "What goes wrong if you swap lines 5 and 6, flipping the pointer before saving cur.next?",
        options: ["The rest of the list is lost", "The list comes out in the original order", "It runs forever", "Nothing; the order doesn’t matter"],
        answer: 0,
        explain: "Once `cur.next = prev` runs, `cur.next` no longer leads to the rest of the list. Saving it afterwards just saves `prev`, so everything after `cur` becomes unreachable.",
      },
    },
  },

  compare: {
    tradeoffs: "Both visit each node once, so their time grows the same way. The difference is memory: copying stores n values and builds n new nodes, while flipping in place needs three pointers. The cost of in-place is that it changes the original list.",
    takeaways: [
      "Before copying data to rearrange it, ask whether you could rearrange the pointers instead.",
      "When you’re about to overwrite a pointer, save what it pointed to first.",
      "Keep an invariant you can say out loud: “`prev` leads the reversed part, `nxt` leads the rest.”",
    ],
    pattern: {
      name: "Pointer rewiring with prev / cur / next",
      recognize: "A linked-list problem asks you to reverse, reorder or splice nodes, especially “in place” or “with O(1) extra memory”.",
      alsoUsedIn: ["Reverse Linked List II", "Reverse Nodes in k-Group", "Palindrome Linked List", "Reorder List"],
    },
  },

  growth: {
    sizes: [8, 16, 32, 64, 128],
    spaceSizes: [8, 16, 32],
    input: (n) => [{ kind: "linked_list", values: Array.from({ length: n }, (_, i) => i + 1) }],
    describe: "a linked list of n nodes",
  },

  edgeCases: [
    [{ kind: "linked_list", values: [] }],  // empty list
    [{ kind: "linked_list", values: [7] }], // a single node
  ],
};
