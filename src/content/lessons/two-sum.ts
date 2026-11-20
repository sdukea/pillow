import type { Lesson } from "../lesson";

export const twoSum: Lesson = {
  card: {
    slow: "Try every pair of numbers.",
    waste: "Each number gets paired with every other one.",
    trick: "Remember each number you pass. Then ask: is my partner already here?",
    recognize: "Looking for a pair that adds up? Store what you’ve seen.",
  },
  reasoning: [
    {
      "ask": "The slow way tries every pair. For each number, what is it really looking for?",
      "concepts": [
        "complement"
      ],
      "choices": [
        {
          "text": "One exact partner: the target minus itself.",
          "correct": true,
          "reply": "Exactly. With a target of 9, the number 2 needs a 7 and nothing else. It’s searching for one known value."
        },
        {
          "text": "Any number smaller than the target.",
          "reply": "Smaller isn’t enough: 2 needs exactly 7. Any other number makes the wrong sum."
        },
        {
          "text": "Every other number, one at a time, to be thorough.",
          "misconception": "more-loops-is-thorough",
          "reply": "Trying everything is what the slow way does. But only one value can ever work for each number."
        }
      ],
      "hints": [
        "Take 2 and a target of 9. Which numbers would complete the sum?",
        "Only one value works: 9 − 2."
      ]
    },
    {
      "ask": "Each number needs one exact partner. What’s the fastest way to check whether you’ve already passed it?",
      "concepts": [
        "hash-map",
        "hash-lookup"
      ],
      "choices": [
        {
          "text": "Remember every number you pass in a hash map, and look the partner up.",
          "correct": true,
          "reply": "Yes. A lookup takes about one step, however many numbers are stored. One pass, no inner loop."
        },
        {
          "text": "Scan back through the numbers you’ve passed.",
          "reply": "That scan is the slow way’s inner loop again: it grows with the list."
        },
        {
          "text": "A hash map wouldn’t help: it has to check all its keys too.",
          "misconception": "lookup-scans",
          "reply": "A hash map jumps straight to where a key would be. That’s about one step, whether it holds 10 keys or a million."
        }
      ],
      "hints": [
        "The slow way’s inner loop is a search through numbers you’ve already seen.",
        "Which structure answers “have I seen 7?” in one step?"
      ]
    }
  ],
  understand: {
    statement: "You get a list of numbers and a target. Exactly two of the numbers add up to the target. Return **where** those two numbers are in the list.",
    inputs: [
      { name: "nums", meaning: "The list of numbers. Positions (indices) start at 0, so in `[11, 15, 3]`, 11 is at index 0." },
      { name: "target", meaning: "The sum the two numbers must add up to." },
    ],
    output: "A list of the two indices, like `[4, 5]`. The order doesn’t matter, but you can’t use the same index twice.",
    walkthrough: [
      "Take `nums = [11, 15, 3, 8, 2, 7]` and `target = 9`.",
      "11 and 15 are already bigger than 9 on their own, so they can’t be part of the answer.",
      "3 would need a 6, and there isn’t one. 8 would need a 1, and there isn’t one.",
      "2 needs a 7, and 7 is there. 2 is at index 4 and 7 is at index 5.",
      "So the answer is `[4, 5]`.",
    ],
    constraints: [
      "There is always exactly one answer.",
      "The same **value** can appear twice (`[3, 3]` with target 6 is fine), but the same **index** can’t be used twice.",
      "On LeetCode, a list can hold up to 10,000 numbers. Checking every pair of 10,000 numbers means about 50 million checks.",
    ],
    testing: "Whether you can turn “search for a partner” into “look the partner up”: trading a little memory for a lot of speed.",
    check: {
      question: "nums = [3, 3] and target = 6. What should you return?",
      options: ["[0, 1]", "[0, 0]", "[3, 3]", "There’s no answer"],
      answer: 0,
      explain: "The two 3s are at different indices, 0 and 1, so they form a valid pair. `[0, 0]` would use the same number twice, and `[3, 3]` gives values instead of indices.",
    },
  },

  approaches: {
    "brute-force": {
      concepts: ["arrays", "nested-loops", "complexity"],
      headline: "Check every pair",
      intuition: "If you don’t know which two numbers work, try them all. Pair the first number with each number after it, then the second number with each number after it, and so on, until a pair adds up to the target.",
      discovery: "This is what you’d do by hand with a short list. It’s the natural first answer, and it’s worth writing because it’s obviously correct. Every faster approach has to give the same answers.",
      steps: [
        "Pick a first number, at index `i`, for every index in turn.",
        "For each one, pick a second number at index `j`, from the indices after `i`.",
        "If the two add up to the target, return `[i, j]`.",
      ],
      notes: {
        2: { what: "Picks the first number of a pair, at index `i`, trying every index in turn.", why: "Every pair starts somewhere. Trying every starting point means no pair is missed.", affects: "`i`", ifRemoved: "There’d be no first number to pair with, so nothing would ever be checked." },
        3: { what: "Picks the second number, at index `j`, from the indices after `i`.", why: "Starting at `i + 1` skips pairing a number with itself, and avoids checking the same pair twice (2 + 7 and later 7 + 2).", affects: "`j`", ifRemoved: "Starting `j` at 0 instead would pair a number with itself (wrong when x + x equals the target) and double the work." },
        4: { what: "Adds the two numbers and compares the sum with the target.", why: "This is the test the problem asks for. Everything else is choosing which pair to test.", ifRemoved: "The function would return the very first pair it tried, right or not." },
        5: { what: "Returns the indices of the pair.", why: "The problem asks for positions, not values, and returning ends the search as soon as the answer is found.", ifRemoved: "The loops would keep going past the answer, and nothing would be reported." },
        6: { what: "Returns an empty list if no pair worked.", why: "LeetCode guarantees an answer, so this only runs on inputs without one. It makes the function’s behaviour clear for every input.", ifRemoved: "Python would return `None` for inputs with no answer, which a caller might not expect." },
      },
      complexity: {
        time: "n²",
        space: "1",
        counted: "every line Python runs, most of them the comparison on line 4",
        timeWhy: "The first number at index 0 is compared with n − 1 others, the one at index 1 with n − 2, and so on. That adds up to about n²/2 comparisons, so doubling the list roughly quadruples the work.",
        spaceWhy: "It only keeps two indices, `i` and `j`, however long the list is.",
      },
      whyNotEnough: "It forgets everything. When it moves on to the next first number, it re-reads all the same numbers again, and on a list of 10,000 numbers that’s about 50 million comparisons.",
      check: {
        question: "Which line is responsible for the n² in brute force?",
        options: ["Line 3: the inner loop over j", "Line 4: the addition", "Line 5: the return", "Line 2 on its own"],
        answer: 0,
        explain: "Line 2 runs n times, and for each of those, line 3 starts a loop of up to n more. A loop inside a loop is what multiplies n by n. The addition on line 4 is cheap; it just runs n² times because of the two loops around it.",
      },
    },

    "hash-map": {
      concepts: ["hash-map", "hash-lookup", "complement", "time-space"],
      headline: "Look the partner up",
      intuition: "Walk through the list once. For each number, ask: have I already seen the number that would complete the pair? Keep everything you’ve seen in a map, so that question takes one step instead of a search.",
      discovery: "Watch brute force and notice what it keeps doing: for every number it searches for one specific partner, target minus that number. If we remembered the numbers we’d passed, we could just look that partner up.",
      steps: [
        "Start with an empty map from number to index.",
        "For each number `x` at index `i`, work out the partner it needs: `target − x`.",
        "If the partner is in the map, return the partner’s index and `i`.",
        "Otherwise, store `x` with its index and move on.",
      ],
      insight: {
        inefficiency: "The inner loop. For every number, brute force scans the rest of the list looking for a partner.",
        repeatedWork: "Each scan re-reads numbers it has already read. By the time it reaches 7, it has looked at 2 several times, and it never remembers it.",
        observation: "For a number `x`, only one partner works: `target − x`. So the question “which `j` makes a pair?” becomes “have I already seen `target − x`?”",
        technique: "A hash map (a Python `dict`) answers “have I seen this?” in about one step, however much it holds, and it can also store where we saw it.",
        whyItWorks: "Every pair has a first number and a second. When the loop reaches the second, the first is already in the map, so the lookup finds it.",
        tradeoffs: "It spends memory on the map (up to n entries) to save time. That’s almost always worth it, and it’s the answer interviewers expect.",
      },
      notes: {
        2: { what: "Creates an empty map from a number to the index where we saw it.", why: "This memory replaces the inner loop: instead of searching for a partner, we’ll look it up.", affects: "`seen`", ifRemoved: "There’d be nowhere to remember earlier numbers, and the lookup on line 5 would fail." },
        3: { what: "Visits each number once, together with its index.", why: "One pass is enough: by the time we reach a number, every number before it is already in the map.", affects: "`i` and `x`", ifRemoved: "Using `for x in nums` alone would lose the index, which is what we have to return." },
        4: { what: "Works out the partner `x` would need: `target − x`.", why: "It turns “find two numbers that add up to the target” into “have I seen this one number?”", affects: "`need`", ifRemoved: "There’d be nothing specific to look up, and we’d be back to searching." },
        5: { what: "Asks the map whether the partner appeared earlier.", why: "Looking a key up in a map takes about the same time however big the map is. Scanning a list doesn’t.", ifRemoved: "Writing `if need in nums` instead would scan the whole list every time, bringing back the n² cost, and could pair `x` with itself." },
        6: { what: "Returns where the partner was and where we are now.", why: "The partner came first, so its index is the smaller one.", ifRemoved: "The loop would carry on past the answer and never report it." },
        7: { what: "Remembers `x` and its index, for numbers that come later.", why: "Storing **after** the check means `x` can’t pair with itself, which matters for something like `[3, 2, 4]` with target 6.", affects: "`seen`", ifRemoved: "Without it the map stays empty and nothing is ever found. Storing before the check would let a number pair with itself." },
        8: { what: "Returns an empty list if no pair was found.", why: "Same as brute force: LeetCode guarantees an answer, so this only runs on inputs without one.", ifRemoved: "Python would return `None` for inputs with no answer." },
      },
      complexity: {
        time: "n",
        space: "n",
        counted: "every line Python runs",
        timeWhy: "Each number is visited once, and the lookup and the store each take about one step on average. So the work grows in step with the list: double the list, double the work.",
        spaceWhy: "In the worst case, the pair is the last two numbers and the map ends up holding every number before them.",
      },
      check: {
        question: "Why does the code check the map before storing x, and not after?",
        options: ["So x can’t be paired with itself", "Because storing is slower than checking", "To keep the map sorted", "It doesn’t matter which comes first"],
        answer: 0,
        explain: "If `x` were stored first, a number that is exactly half the target (3 with target 6) would find itself in the map. Checking first means the map only holds numbers from earlier indices.",
      },
    },
  },

  compare: {
    tradeoffs: "Brute force uses almost no memory but does work that grows with the square of the list. The hash map stores up to n numbers and does work that grows in step with the list. Memory is cheap and time isn’t, so the hash map wins for anything but tiny lists.",
    takeaways: [
      "When you keep searching for one specific value, ask whether you could look it up instead.",
      "A hash map turns “search” (n steps) into “look up” (about 1 step), at the cost of memory.",
      "Check before you store, when an element mustn’t match itself.",
    ],
    pattern: {
      name: "Complement lookup",
      recognize: "You need two things that combine to make a target, or you keep asking “have I already seen something that matches this?”",
      alsoUsedIn: ["Contains Duplicate", "Subarray Sum Equals K", "Longest Consecutive Sequence", "3Sum (with a twist)"],
    },
  },

  growth: {
    sizes: [8, 16, 32, 64, 128],
    spaceSizes: [8, 16, 32],
    // Worst case for both: the only pair is the last two numbers.
    input: (n) => [{ kind: "value", value: [...Array.from({ length: n - 2 }, (_, i) => 100 + i), 1, 2] }, { kind: "value", value: 3 }],
    describe: "n numbers where the only pair that works is the last two",
  },

  edgeCases: [
    [{ kind: "value", value: [1, 2, 4] }, { kind: "value", value: 99 }], // no pair: reaches the final return
    [{ kind: "value", value: [3, 3] }, { kind: "value", value: 6 }],     // equal values at different indices
    [{ kind: "value", value: [3, 2, 4] }, { kind: "value", value: 6 }],  // a number that's half the target mustn't pair with itself
  ],
};
