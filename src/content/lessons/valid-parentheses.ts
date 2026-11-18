import type { Lesson } from "../lesson";

export const validParentheses: Lesson = {
  card: {
    slow: "Delete matching pairs until nothing’s left.",
    waste: "Every deletion restarts the scan from the beginning.",
    trick: "The last bracket opened must be the first one closed. That’s a stack.",
    recognize: "Things that open and close in order? Use a stack.",
  },
  understand: {
    statement: "You get a string of brackets: `()`, `[]` and `{}`. Decide whether it’s **valid**: every opening bracket is closed by the same kind of bracket, in the right order.",
    inputs: [{ name: "s", meaning: "A string made only of the six characters `( ) [ ] { }`." }],
    output: "`True` if the brackets are valid, `False` if not.",
    walkthrough: [
      "Take `s = \"{[()]}()\"`.",
      "Read it inside out: `()` closes, so does the `[` `]` around it, and so does the `{` `}` around that.",
      "Then `()` stands on its own and closes too.",
      "Every bracket found its partner, in order, so the answer is `True`.",
      "Compare `\"([)]\"`: each kind appears twice, but the `[` is closed after the `)` that was opened inside it. That’s `False`.",
    ],
    constraints: [
      "Order matters, not just counts. `\"([)]\"` has one of each pair and is still invalid.",
      "An empty string counts as valid: nothing is left unclosed.",
      "A closing bracket with nothing open before it, like `\"]\"`, makes the string invalid straight away.",
      "On LeetCode, a string can be up to 10,000 characters long.",
    ],
    testing: "Whether you see that the most recently opened bracket must be the first one closed, and know which structure works that way.",
    check: {
      question: "Is \"([]{})\" valid?",
      options: ["Yes", "No, the brackets are mixed", "No, it has an odd number of characters", "No, { can’t be inside ("],
      answer: 0,
      explain: "`[]` closes, then `{}` closes, and the outer `(` `)` wraps them both. Brackets of different kinds can nest and sit side by side, as long as each one closes in order.",
    },
  },

  approaches: {
    "delete-pairs": {
      headline: "Delete matching pairs until none are left",
      intuition: "A valid string always has at least one matching pair sitting side by side, like `()`. Delete it, and the brackets around it may now form a pair. Keep deleting adjacent pairs. If everything disappears, the string was valid.",
      discovery: "Try it on paper with `{[()]}`: cross out `()`, then `[]` is touching, then `{}`. That’s exactly what this approach automates.",
      steps: [
        "Copy the characters into a list you can delete from.",
        "Scan from the start for two neighbours that make a matching pair, like `(` followed by `)`.",
        "Delete the pair and scan again from the start, because the deletion may have brought a new pair together.",
        "When a whole scan finds no pair, stop. The string was valid if nothing is left.",
      ],
      notes: {
        2: { what: "Records which closing bracket each opening bracket needs.", why: "It lets one check (`pairs[a] == b`) recognise all three kinds of pair.", affects: "`pairs`", ifRemoved: "You’d need three separate comparisons, one per bracket kind." },
        3: { what: "Copies the string into a list.", why: "Python strings can’t be changed in place, and we need to delete characters from the middle.", affects: "`chars`", ifRemoved: "Line 9 couldn’t delete anything, because `s` itself can’t be changed." },
        4: { what: "Pretends something was removed.", why: "The loop on line 5 only runs while the last pass removed something, so this makes the first pass happen.", affects: "`removed`", ifRemoved: "`removed` wouldn’t exist yet, and line 5 would fail." },
        5: { what: "Keeps scanning while the last pass deleted a pair.", why: "If a full pass finds no pair, another pass won’t either, so we can stop.", ifRemoved: "Scanning only once would miss pairs that only touch after a deletion, like the `[]` in `[()]`." },
        6: { what: "Marks this pass as having removed nothing so far.", why: "If it stays `False` to the end of the pass, the loop stops.", affects: "`removed`", ifRemoved: "`removed` would stay `True` forever, and the loop would never end." },
        7: { what: "Moves along the list, looking at each neighbouring pair of positions `i` and `i + 1`.", why: "A deletable pair is always two characters side by side.", affects: "`i`", ifRemoved: "Using `range(len(chars))` would read one past the end on line 8." },
        8: { what: "Checks whether position `i` opens a bracket that position `i + 1` closes.", why: "`pairs.get(chars[i])` is the closer that bracket needs, or `None` if it’s already a closer. Only an opener immediately followed by its own closer can be safely deleted.", ifRemoved: "Deleting any two neighbours would destroy valid strings." },
        9: { what: "Deletes the pair from the list.", why: "A matched pair has done its job; removing it may bring the brackets around it together.", affects: "`chars`", ifRemoved: "Nothing would shrink, and every pass would find the same pair forever." },
        10: { what: "Records that this pass changed something.", why: "It tells the loop on line 5 to scan again.", affects: "`removed`", ifRemoved: "The loop would stop after the first deletion and wrongly report most strings as invalid." },
        11: { what: "Abandons this pass and starts again from the beginning.", why: "The list just changed, so the rest of this scan is out of date.", ifRemoved: "The scan would carry on over shifted positions and could skip a pair." },
        12: { what: "Returns `True` if nothing is left.", why: "Every bracket found its partner exactly when the list is empty.", ifRemoved: "Returning `True` unconditionally would accept strings like `\"((\"`." },
      },
      complexity: {
        time: "n²",
        space: "n",
        counted: "every line Python runs",
        timeWhy: "Each deletion removes 2 characters and is followed by a fresh scan from the start. For deeply nested brackets like `((((…))))`, each scan has to walk to the middle to find the one pair there, and there are about n/2 pairs, so the work grows with the square of n.",
        spaceWhy: "It keeps a full copy of the characters to delete from.",
      },
      whyNotEnough: "It keeps re-reading the start of the list. After every single deletion it walks back over brackets it has already read and already knows are still open.",
      check: {
        question: "Why must the scan start again from the beginning after a deletion?",
        options: ["The deletion may have brought a new pair together", "Python requires it after del", "To count the pairs", "It doesn’t need to; it’s just simpler"],
        answer: 0,
        explain: "In `[()]`, deleting `()` makes `[` and `]` neighbours. Restarting finds that new pair. (Restarting from just before the deletion would be enough, which is the first hint at a smarter approach.)",
      },
    },

    stack: {
      headline: "Keep a stack of open brackets",
      intuition: "Read left to right. Put each opening bracket on a stack. When a closing bracket arrives, it must match the bracket on top, the most recently opened one. If it does, pop it; if it doesn’t, the string is invalid.",
      discovery: "Notice what the delete-pairs approach keeps re-reading: the brackets that are still open. A closing bracket only ever needs the **most recent** of them, so keep just those, in order.",
      steps: [
        "Start with an empty stack.",
        "For each opening bracket, push it onto the stack.",
        "For each closing bracket, check that the stack’s top is its partner. If not, return `False`; if so, pop it.",
        "At the end, the string is valid only if the stack is empty.",
      ],
      insight: {
        inefficiency: "Rescanning. After every deletion, the delete-pairs approach walks back over the start of the list.",
        repeatedWork: "The brackets it re-reads haven’t changed. They’re still open and still waiting, in the same order, every time.",
        observation: "A closing bracket always belongs to the **most recently opened** bracket that’s still open. Last opened, first closed.",
        technique: "A stack does exactly that: add to the top, and only ever look at or remove the top. Pushing and popping each take one step.",
        whyItWorks: "The stack always holds the open brackets in the order they were opened, so its top is always the one the next closing bracket must match. Each character is handled once, as it arrives.",
        tradeoffs: "The stack can hold up to n/2 brackets, the same order of memory as the copy in the delete approach, but now each character is read once instead of again and again.",
      },
      notes: {
        2: { what: "Records which opening bracket each closing bracket needs.", why: "When a closer arrives, `pairs[ch]` is exactly what the top of the stack should be.", affects: "`pairs`", ifRemoved: "You’d need three separate comparisons, one per bracket kind." },
        3: { what: "Creates an empty stack for the open brackets.", why: "It remembers which brackets are still waiting to be closed, most recent on top.", affects: "`stack`", ifRemoved: "There’d be nowhere to remember open brackets." },
        4: { what: "Reads the characters one at a time, left to right.", why: "Each character is dealt with as it arrives; nothing is read twice.", affects: "`ch`", ifRemoved: "Nothing would be checked at all." },
        5: { what: "Checks whether `ch` is a closing bracket.", why: "Closers and openers are handled differently: closers are checked, openers are stored.", ifRemoved: "Every character would be pushed, so the stack would never shrink and every string would look invalid." },
        6: { what: "Checks that something is open and that the top of the stack is `ch`’s partner.", why: "A closer is only correct if it closes the most recently opened bracket.", ifRemoved: "Without the `not stack` part, a string starting with `]` would crash on `stack[-1]`. Without the comparison, `\"(]\"` would be accepted." },
        7: { what: "Returns `False`.", why: "A mismatch can’t be fixed by anything later in the string.", ifRemoved: "The loop would carry on after a mismatch and could report `True` for an invalid string." },
        8: { what: "Pops the matched opener off the stack.", why: "It’s been closed, so it’s no longer waiting.", affects: "`stack`", ifRemoved: "The stack would keep closed brackets, so the next closer would be compared with the wrong one." },
        10: { what: "Pushes the opening bracket onto the stack.", why: "It now waits, on top, for its closer.", affects: "`stack`", ifRemoved: "Openers would never be recorded, so every closer would look unmatched." },
        11: { what: "Returns `True` only if the stack is empty.", why: "Anything left on the stack was opened and never closed.", ifRemoved: "Returning `True` unconditionally would accept strings like `\"((\"`." },
      },
      complexity: {
        time: "n",
        space: "n",
        counted: "every line Python runs",
        timeWhy: "Each character is read once, and pushing or popping takes one step. Double the string, double the work.",
        spaceWhy: "In the worst case, like `((((…))))`, half the string is pushed before anything is popped.",
      },
      check: {
        question: "What does it mean if the stack isn’t empty after the loop finishes?",
        options: ["Some brackets were opened and never closed", "Some brackets were closed twice", "The string was too long", "The last bracket was a closer"],
        answer: 0,
        explain: "Every opener is pushed, and every correct closer pops one. Anything left over was opened but never closed, as in `\"(()\"`.",
      },
    },
  },

  compare: {
    tradeoffs: "Both keep up to n characters around, so memory grows the same way. The difference is time: deleting pairs rescans from the start after every deletion (n²), while the stack reads each character once (n).",
    takeaways: [
      "When something must be undone in the reverse order it was done, reach for a stack.",
      "Look for the work you repeat: re-reading data you already understood is a sign you should be storing it.",
      "Check for an empty stack before looking at its top.",
    ],
    pattern: {
      name: "Matching with a stack",
      recognize: "Things open and close, nest, or must be undone in reverse order: brackets, tags, function calls, undo history.",
      alsoUsedIn: ["Min Stack", "Evaluate Reverse Polish Notation", "Decode String", "Remove All Adjacent Duplicates in String"],
    },
  },

  growth: {
    sizes: [8, 16, 32, 64, 128],
    spaceSizes: [8, 16, 32],
    // Deep nesting: the worst case for rescanning, and the most the stack ever holds.
    input: (n) => [{ kind: "value", value: "(".repeat(n / 2) + ")".repeat(n / 2) }],
    describe: "n brackets nested as deeply as they go, like `((()))`",
  },

  edgeCases: [
    [{ kind: "value", value: "" }],
    [{ kind: "value", value: "]" }],
    [{ kind: "value", value: "(]" }],
    [{ kind: "value", value: "((" }],
    [{ kind: "value", value: "([)]" }],
  ],
};
