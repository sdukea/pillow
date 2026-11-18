import type { Lesson } from "../lesson";

export const binarySearch: Lesson = {
  card: {
    slow: "Check every number, left to right.",
    waste: "It never uses the fact that the list is sorted.",
    trick: "Look at the middle. Throw away the half that can’t hold the target.",
    recognize: "Sorted data? Halve what’s left at every step.",
  },
  understand: {
    statement: "You get a list of numbers in increasing order and a target. Return the target’s index, or `-1` if it isn’t there.",
    inputs: [
      { name: "nums", meaning: "The numbers, sorted from smallest to largest, with no repeats." },
      { name: "target", meaning: "The number to find." },
    ],
    output: "The index where `target` is, or `-1` if it isn’t in the list.",
    walkthrough: [
      "Take `nums = [1, 3, 5, …, 23]` (12 odd numbers) and `target = 19`.",
      "Checking from the front, 19 turns up at index 9, after 10 checks.",
      "But the list is sorted. Look at the middle first: index 5 holds 11, which is too small, so 19 must be to its right. Half the list is ruled out in one check.",
      "Repeat on what’s left (17 at index 8 is too small, 21 at index 10 is too big), and 19 is found at index 9 in 4 checks.",
    ],
    constraints: [
      "The list is sorted. That’s the whole key to this problem.",
      "The target might not be there; then return `-1`.",
      "LeetCode asks for O(log n) time, which rules out checking every number.",
    ],
    testing: "Whether you can use sorted order to throw away half of the remaining possibilities with every check, and get the boundaries exactly right.",
    check: {
      question: "nums = [2, 4, 6, 8] and target = 5. What should you return?",
      options: ["-1", "2", "1", "3"],
      answer: 0,
      explain: "5 isn’t in the list, so the answer is `-1`. It would sit between indices 1 and 2, but the problem asks where it **is**, not where it would go.",
    },
  },

  approaches: {
    "check-every": {
      concepts: ["arrays", "loops", "complexity"],
      headline: "Check every number",
      intuition: "Start at the front and compare each number with the target until you find it, or run out of numbers.",
      discovery: "This is how you’d look for anything in a list you know nothing about. It’s always correct, and it’s a fair first step, as long as you notice it ignores the most useful fact you were given: the list is sorted.",
      steps: [
        "Look at each index in turn, from the front.",
        "If the number there is the target, return the index.",
        "If you reach the end, return `-1`.",
      ],
      notes: {
        2: { what: "Visits every index, from the front.", why: "Without using any other information, any position could hold the target.", affects: "`i`", ifRemoved: "Nothing would be checked." },
        3: { what: "Compares the number at `i` with the target.", why: "This is the only way this approach learns anything.", ifRemoved: "The function couldn’t tell when it had found the target." },
        4: { what: "Returns the index where the target was found.", why: "The problem asks for the position.", ifRemoved: "The loop would keep going past the target and return `-1`." },
        5: { what: "Returns `-1` after checking every number.", why: "Only after looking everywhere can we be sure the target is missing.", ifRemoved: "Python would return `None` for a missing target." },
      },
      complexity: {
        time: "n",
        space: "1",
        counted: "every line Python runs",
        timeWhy: "When the target is missing, or last, every one of the n numbers is checked. Double the list, double the checks.",
        spaceWhy: "Only the index `i` is kept, however long the list is.",
      },
      whyNotEnough: "Each check rules out just one number. In a sorted list, finding that 9 is smaller than 19 also proves that every number before 9 is smaller, but this approach never uses that. On 10,000 numbers, a missing target costs 10,000 checks.",
      check: {
        question: "What fact about the input does this approach ignore?",
        options: ["The list is sorted", "The numbers are unique", "The target is a number", "The list isn’t empty"],
        answer: 0,
        explain: "It would work the same on an unsorted list. That’s the sign it’s leaving the most useful information unused.",
      },
    },

    halving: {
      concepts: ["sorted-order", "binary-search", "invariant"],
      headline: "Halve the search range each time",
      intuition: "Look at the middle of the range that could still hold the target. If the middle number is too small, the target must be to the right; if it’s too big, to the left. Either way, half the range is gone.",
      discovery: "Watch the first approach on a sorted list: one comparison tells you far more than it uses. If the number at an index is smaller than the target, so is every number before it.",
      steps: [
        "Keep `lo` and `hi`, the first and last index that could still hold the target.",
        "Check the middle index, `mid`.",
        "If it’s the target, return `mid`. If it’s too small, move `lo` to `mid + 1`. If it’s too big, move `hi` to `mid − 1`.",
        "Repeat while `lo ≤ hi`. If the range empties, return `-1`.",
      ],
      insight: {
        inefficiency: "One comparison rules out one number.",
        repeatedWork: "Checking from the front keeps comparing numbers that sorted order has already ruled out. Once 9 is too small, every number before 9 is too small as well.",
        observation: "In a sorted list, a single comparison with the **middle** number tells you which half the target is in.",
        technique: "Binary search: keep two boundaries, `lo` and `hi`, and move one of them past the middle after every comparison.",
        whyItWorks: "The target, if it exists, always stays between `lo` and `hi`: a boundary only moves past numbers that are too small or too big. The range halves each time, so after about log₂ n checks it’s down to one number or empty.",
        tradeoffs: "It only works on sorted data. Sorting an unsorted list first costs more than one linear scan, so binary search pays off when you search the same sorted data many times.",
      },
      notes: {
        2: { what: "Sets the range that could hold the target: the whole list, from index 0 to the last index.", why: "Before any comparison, the target could be anywhere.", affects: "`lo` and `hi`", ifRemoved: "Using `hi = len(nums)` instead (one past the end) would make line 4 read past the end of the list." },
        3: { what: "Keeps going while the range isn’t empty.", why: "When `lo` passes `hi`, every index has been ruled out.", ifRemoved: "Writing `while lo < hi` instead would stop with one index left unchecked, and miss a target sitting there." },
        4: { what: "Picks the middle index of the range.", why: "The middle splits the range into two halves as evenly as possible, so each check removes as much as it can.", affects: "`mid`", ifRemoved: "Without a middle there’s nothing to compare, and no way to rule out half." },
        5: { what: "Checks whether the middle number is the target.", why: "If it is, we’re done.", ifRemoved: "The function would never notice when it had found the target." },
        6: { what: "Returns the index where the target is.", why: "The problem asks for the position.", ifRemoved: "The loop would carry on past the target." },
        7: { what: "Decides which half to keep, by comparing the middle number with the target.", why: "Sorted order means everything on the too-small side is too small as well.", ifRemoved: "There’d be no way to know which half the target is in." },
        8: { what: "Moves `lo` just past the middle.", why: "The middle and everything before it are too small.", affects: "`lo`", ifRemoved: "Writing `lo = mid` instead can get stuck: with two numbers left, `mid` equals `lo` and the range never shrinks." },
        10: { what: "Moves `hi` just before the middle.", why: "The middle and everything after it are too big.", affects: "`hi`", ifRemoved: "Writing `hi = mid` instead can loop forever on the last couple of numbers." },
        11: { what: "Returns `-1` once the range is empty.", why: "Every index has been ruled out, so the target isn’t there.", ifRemoved: "Python would return `None` for a missing target." },
      },
      complexity: {
        time: "log n",
        space: "1",
        counted: "every line Python runs",
        timeWhy: "Each pass halves the range. Starting from n numbers, it takes about log₂ n halvings to get down to one: 4,096 numbers need only about 12 checks. Doubling the list adds just one more check.",
        spaceWhy: "Only three indices, `lo`, `hi` and `mid`, however long the list is.",
      },
      check: {
        question: "Why does the code use lo = mid + 1 rather than lo = mid?",
        options: ["mid has already been checked, and lo = mid can get stuck", "To make the code shorter", "Because indices start at 0", "It makes no difference"],
        answer: 0,
        explain: "`nums[mid]` was already compared, so it can be excluded. And with two numbers left, `mid` equals `lo`, so `lo = mid` would leave the range unchanged forever.",
      },
    },
  },

  compare: {
    tradeoffs: "Neither uses extra memory. Checking every number does work in step with the list (n); halving does work that barely grows (log n). On 4,096 numbers, that’s thousands of checks against about a dozen. Halving needs the list to be sorted.",
    takeaways: [
      "Sorted data is a gift: one comparison can rule out half of everything.",
      "Keep the range of possibilities explicit (`lo`, `hi`) and make sure every step shrinks it.",
      "Most binary search bugs are off by one: decide whether `hi` is inclusive and stay consistent.",
    ],
    pattern: {
      name: "Binary search: halve the possibilities",
      recognize: "The data is sorted, or the answer is a number where every value below works and every value above doesn’t (or the other way round).",
      alsoUsedIn: ["Search in Rotated Sorted Array", "Find Minimum in Rotated Sorted Array", "Koko Eating Bananas", "Search a 2D Matrix"],
    },
  },

  growth: {
    sizes: [16, 64, 256, 1024, 4096],
    spaceSizes: [16, 64, 256],
    // The target is missing: checking every number has to look at all of them.
    input: (n) => [{ kind: "value", value: Array.from({ length: n }, (_, i) => 2 * i) }, { kind: "value", value: 2 * n + 1 }],
    describe: "n sorted numbers and a target that isn’t there",
  },

  edgeCases: [
    [{ kind: "value", value: [] }, { kind: "value", value: 5 }],
    [{ kind: "value", value: [5] }, { kind: "value", value: 5 }],
    [{ kind: "value", value: [1, 3] }, { kind: "value", value: 2 }],
    [{ kind: "value", value: [1, 3, 5] }, { kind: "value", value: 0 }],
  ],
};
