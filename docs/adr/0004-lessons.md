# ADR 0004: Lessons, line notes and measured complexity

**Status:** accepted, 2026-11-15

## Decisions

1. **A lesson has four kinds of chapter**, each with its own URL
   (`?chapter=`):
   - **Understand:** a plain-language statement, inputs and outputs, a
     hand-worked example, constraints, and what the problem really tests.
   - **One chapter per approach**, brute force first. Each has the
     intuition, how you'd think of it (or, for a better approach, the
     reasoning: what was slow, the repeated work, the key observation, the
     tool, why it works, and the trade-off), the plan, the player, and then
     complexity plus "why we can't stop here".
   - **Compare:** a table, a growth chart, the trade-off, takeaways, and the
     reusable pattern.
   Problems without a lesson show the player only.
2. **Every line that runs has a note:** what it does, why it's needed, what
   it changes, and what goes wrong without it (or with a tempting variation
   of it). The note for the line that just ran appears under the code, in
   sync with the step. Clicking any line explains it until the next step.
3. **Complexity claims are measured, not asserted.** The build runs each
   approach on worst-case inputs of growing size (in a count-only tracer
   mode with no snapshots), counts every line run, and measures peak extra
   memory (the elements in structures the algorithm creates, excluding the
   input). Growth is classified by least-squares fitting of log n, n,
   n log n and n² (each with a constant offset), and the build fails if a
   lesson's claim doesn't match.
4. **Lessons declare edge cases** (no answer, empty list, a single node).
   The build traces them, validates narration on them, and requires notes
   for any line they reach. That's how rarely-run lines like `return []`
   get checked.
5. **Checks are optional and ungraded.** A learner picks an answer and sees
   why the right one is right. Nothing is scored or stored.
6. **The growth chart draws n to scale.** With evenly spaced sizes,
   straight lines look flat and curves look explosive; a chart about growth
   has to be honest about the axis.
7. **Lesson prose supports only `code` and bold**, rendered by a tiny
   formatter, so content can't inject markup.

## Content decisions

- **Reverse Linked List's brute force is "copy and rebuild".** It has the
  same O(n) time as flipping in place, so the lesson is about memory (O(n)
  against O(1)) and about mutating versus building new. That's a different,
  equally important kind of trade-off.

## Evidence

The validator caught two real issues during authoring: notes on lines that
never ran (which led to edge cases), and a growth classifier that couldn't
separate n log n from n or see past constant overhead (now replaced by
model fitting, with tests). Measured growth for Two Sum: brute force
70 → 16,510 steps (n²), hash map 33 → 513 (n).
