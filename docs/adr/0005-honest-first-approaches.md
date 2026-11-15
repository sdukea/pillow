# ADR 0005: Honest first approaches

**Status:** accepted, 2026-11-16

M4 gave the four remaining MVP problems full lessons. Each one needed a
first approach to improve on, and each first approach had to survive the
same measured-complexity check as the better one. That forced the decisions
below.

## Decisions

1. **The first approach does its work in lines the learner can see.** Valid
   Parentheses' "delete pairs" approach scans for a pair and deletes it with
   `del`, in an explicit loop, rather than calling
   `s.replace("()", "")` until nothing changes. `replace` hides a full scan
   inside one line, so it would be counted as one step: an O(n²) idea would
   measure as O(n), and the lesson would contradict its own chart.
2. **No fake brute force.** Maximum Depth has no meaningfully slower
   correct solution, because every approach must visit every node. Its
   first approach is level by level (a queue), and the lesson says plainly
   that both approaches are O(n) time. The comparison is about memory: the
   widest level against the height. It also covers Python's limit of about
   1,000 nested calls.
3. **Memory counts call frames.** Peak extra memory is now the most items
   held at once in objects the code creates, *plus* frames waiting on the
   call stack. Without frames, recursion looks free. The existing lessons
   are unchanged by this, since they don't recurse.
4. **Measured class plus an honest label.** On the complete trees used to
   measure Maximum Depth, recursion's memory grows as log n, and that is the
   class the build checks. The lesson displays it as `O(h)`, and the queue's
   as `O(w)`. The memory explanation says what h and w are on the measured
   trees, and what they become on a lopsided tree. `Complexity` gained
   optional `timeLabel` and `spaceLabel` fields for this. The measured class
   is still checked.
5. **Every growth chart says what it measured.** `growth.describe` is
   required (for example, "a complete tree of n nodes, with every level
   full"). "Worst case" is no longer claimed for every input; for Maximum
   Depth it wouldn't be true.
6. **Compare shows memory when memory differs.** A second measured chart
   appears whenever the approaches' peak memory differs. It is the heart of
   the Maximum Depth lesson (64 items against 7 at n = 127). It is omitted
   for Binary Search, where both approaches use none.
7. **Edge cases may end before a view exists.** An empty string or an empty
   tree returns before `seen` or `queue` is created. Spec validation still
   requires every view to appear on the example, but not on edge cases.

## Consequences

- The brute-force fixtures are slightly longer than the one-liners people
  memorise, which is the point: they show the work.
- The tree view gained `waiting` (ring the nodes in a queue) and
  `showReturns` (off for non-recursive code), so breadth-first search
  reads correctly.
