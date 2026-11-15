import type { Lesson } from "../lesson";

export const longestSubstring: Lesson = {
  understand: {
    statement: "You get a string. Find the length of the longest **substring** (a run of neighbouring characters) in which no character appears twice.",
    inputs: [{ name: "s", meaning: "Any string: letters, digits, symbols or spaces." }],
    output: "A number: the length of the longest stretch with no repeated character.",
    walkthrough: [
      "Take `s = \"abcabcbb\"`.",
      "`\"abc\"` has no repeats and is 3 long. Adding the next `a` would repeat the first one.",
      "`\"bca\"` and `\"cab\"` are also 3 long. No stretch of 4 avoids a repeat.",
      "So the answer is 3.",
    ],
    constraints: [
      "A substring must be **contiguous**. In `\"pwwkew\"`, `\"pwke\"` skips a character, so it doesn’t count; the answer there is 3 (`\"wke\"`).",
      "The empty string has answer 0.",
      "On LeetCode, a string can be up to 50,000 characters long.",
    ],
    testing: "Whether you can keep a window of “good” characters and slide it forward, instead of starting over every time something goes wrong.",
    check: {
      question: "What’s the answer for \"bbbbb\"?",
      options: ["1", "5", "0", "2"],
      answer: 0,
      explain: "Any stretch of two characters is `\"bb\"`, a repeat. The longest substring without one is a single `\"b\"`, so the answer is 1.",
    },
  },

  approaches: {
    "every-substring": {
      headline: "Try every starting point",
      intuition: "From every starting position, extend a substring one character at a time, remembering the characters in it. Stop as soon as one repeats. The longest run you managed is the answer.",
      discovery: "It’s how you’d check by hand: start at the first letter and go as far as you can, then start at the second letter and do it again.",
      steps: [
        "For every starting index `start`:",
        "Start an empty set and extend `end` from `start`, one character at a time.",
        "If `s[end]` is already in the set, stop extending. Otherwise add it and record the length if it’s the best so far.",
        "Return the best length.",
      ],
      notes: {
        2: { what: "The best length found so far starts at 0.", why: "An empty string has no substring, so 0 is the right answer if nothing better turns up.", affects: "`best`", ifRemoved: "Line 9 would have no `best` to compare with." },
        3: { what: "Tries every index as the start of a substring.", why: "The longest substring could start anywhere.", affects: "`start`", ifRemoved: "Only substrings from index 0 would be considered." },
        4: { what: "Starts an empty set of characters for this starting point.", why: "Each substring is checked on its own, so the characters from the last one mustn’t carry over.", affects: "`seen`", ifRemoved: "Moving the set outside the loop would remember characters from earlier substrings and stop too early." },
        5: { what: "Extends the substring one character at a time.", why: "We want to know how far it can go before a repeat.", affects: "`end`", ifRemoved: "Substrings would never grow beyond nothing." },
        6: { what: "Checks whether the new character is already in this substring.", why: "A set answers that in about one step.", ifRemoved: "Repeats would never be caught, and the answer would be the whole string." },
        7: { what: "Stops extending this substring.", why: "Any longer substring from this start would contain the same repeat.", ifRemoved: "The loop would keep extending past a repeat and count invalid substrings." },
        8: { what: "Adds the new character to the set.", why: "Later characters in this substring must be checked against it.", affects: "`seen`", ifRemoved: "The set would stay empty, so no repeat would ever be found." },
        9: { what: "Records the length if it beats the best so far.", why: "`end − start + 1` is the length of the current substring.", affects: "`best`", ifRemoved: "The answer would never be recorded." },
        10: { what: "Returns the best length found.", why: "Every starting point has been tried.", ifRemoved: "Python would return `None`." },
      },
      complexity: {
        time: "n²",
        space: "n",
        counted: "every line Python runs",
        timeWhy: "For a string with no repeats at all, each of the n starting points extends all the way to the end. That’s about n²/2 extensions, so doubling the string roughly quadruples the work.",
        spaceWhy: "The set can hold every character of the current substring, up to n of them.",
      },
      whyNotEnough: "When it hits a repeat, it throws everything away and starts one character later, re-reading characters it just checked. For `\"abcabcbb\"` it checks `b` and `c` again and again.",
      check: {
        question: "When the substring starting at index 0 of \"abca\" hits the second 'a', what does this approach do next?",
        options: ["Starts again from index 1, re-reading 'b' and 'c'", "Moves past the first 'a' and keeps 'b', 'c'", "Stops: the answer is 3", "Skips to the end"],
        answer: 0,
        explain: "It starts a fresh set from index 1 and re-reads `b` and `c`, even though it already knows they don’t repeat. That re-reading is what the next approach eliminates.",
      },
    },

    "sliding-window": {
      headline: "Slide a window forward",
      intuition: "Keep a window of characters with no repeats. Grow it on the right one character at a time. When the new character is already inside, move the window’s left edge just past its earlier copy. The window never moves backwards.",
      discovery: "Look at what the first approach throws away when it hits a repeat. Everything between the earlier copy of the character and the new one was fine, and it re-reads all of it.",
      steps: [
        "Keep `left`, the start of the window, and a map from each character to where it was last seen.",
        "For each `right` index, with character `ch`:",
        "If `ch` was last seen inside the window, move `left` to just after that position.",
        "Record where `ch` was seen, and the window’s length if it’s the best so far.",
      ],
      insight: {
        inefficiency: "Starting over. Every repeat sends the first approach back to begin a new substring one place later.",
        repeatedWork: "The characters between the repeat’s earlier copy and the new one are re-checked, though they’re already known to be distinct.",
        observation: "When `ch` repeats, the only fix is to drop everything up to and including its earlier copy. The rest of the window is still valid, so keep it.",
        technique: "A sliding window: two indices, `left` and `right`, that only ever move forward, plus a map of where each character was last seen, so `left` can jump straight past a repeat.",
        whyItWorks: "The window always holds distinct characters. Each `right` is the end of the longest valid substring ending there, so the best of those is the answer. Neither edge moves backwards, so each character enters and leaves the window at most once.",
        tradeoffs: "The map holds one entry per distinct character, up to n, though only up to the size of the alphabet for real text. In exchange, each character is read once.",
      },
      notes: {
        2: { what: "Creates a map from each character to the index where it was last seen.", why: "It tells us, in one step, where the earlier copy of a repeat is.", affects: "`last_seen`", ifRemoved: "We couldn’t tell how far to move `left`, and would have to search the window." },
        3: { what: "The window starts at index 0.", why: "Nothing has been read yet, so there’s nothing to exclude.", affects: "`left`", ifRemoved: "Line 6 would have no `left` to compare with." },
        4: { what: "The best length starts at 0.", why: "That’s the right answer for an empty string.", affects: "`best`", ifRemoved: "Line 9 would have no `best` to compare with." },
        5: { what: "Moves the window’s right edge forward, one character at a time.", why: "Each step asks: what’s the longest valid window ending here?", affects: "`right` and `ch`", ifRemoved: "Nothing would be read." },
        6: { what: "Checks whether `ch` was seen before **and** that sighting is inside the current window.", why: "A copy from before `left` is outside the window, so it doesn’t matter.", ifRemoved: "Dropping the `>= left` part would pull `left` backwards on strings like `\"abba\"`, giving 3 instead of 2." },
        7: { what: "Moves the left edge to just after the earlier copy of `ch`.", why: "That’s the smallest move that removes the repeat; everything after it is still distinct.", affects: "`left`", ifRemoved: "The window would contain a repeat and report lengths that are too long." },
        8: { what: "Records that `ch` was last seen at `right`.", why: "If `ch` turns up again, this is the copy we’ll need to move past.", affects: "`last_seen`", ifRemoved: "Repeats would never be detected after the first time." },
        9: { what: "Records the window’s length if it’s the best so far.", why: "The window is valid now, and `right − left + 1` is its length.", affects: "`best`", ifRemoved: "The answer would never be recorded." },
        10: { what: "Returns the best length found.", why: "Every possible right edge has been tried.", ifRemoved: "Python would return `None`." },
      },
      complexity: {
        time: "n",
        space: "n",
        counted: "every line Python runs",
        timeWhy: "`right` visits each character once, and `left` only jumps forward, so the total work grows in step with the string.",
        spaceWhy: "The map gets one entry per distinct character. For a string with no repeats, that’s all n of them.",
      },
      check: {
        question: "In \"abba\", why does line 6 check last_seen[ch] >= left?",
        options: ["So an old copy outside the window doesn’t move left backwards", "To make the map smaller", "To skip the first character", "Because left starts at 0"],
        answer: 0,
        explain: "At the final `a`, `last_seen['a']` is 0, but the window already starts at 2 (after the second `b`). Without the check, `left` would jump back to 1 and the window would wrongly include `b, b`.",
      },
    },
  },

  compare: {
    tradeoffs: "Both may store up to n characters. Trying every start re-reads characters for every starting point (n²); the sliding window reads each one once (n).",
    takeaways: [
      "When a problem asks about contiguous runs, think about a window that only moves forward.",
      "On a failure, move the window as little as possible instead of starting over.",
      "Store “where did I last see this?” to jump the window in one step.",
    ],
    pattern: {
      name: "Sliding window",
      recognize: "The question is about the longest, shortest or best contiguous subarray or substring that satisfies a condition.",
      alsoUsedIn: ["Longest Repeating Character Replacement", "Minimum Window Substring", "Permutation in String", "Best Time to Buy and Sell Stock"],
    },
  },

  growth: {
    sizes: [8, 16, 32, 64, 128],
    spaceSizes: [8, 16, 32],
    // No repeats at all: every start extends to the end, and every character is remembered.
    input: (n) => [{ kind: "value", value: Array.from({ length: n }, (_, i) => String.fromCharCode(0x4e00 + i)).join("") }],
    describe: "a string of n characters with no repeats",
  },

  edgeCases: [
    [{ kind: "value", value: "" }],
    [{ kind: "value", value: "a" }],
    [{ kind: "value", value: "bbbb" }],
    [{ kind: "value", value: "abba" }],
    [{ kind: "value", value: "pwwkew" }],
  ],
};
