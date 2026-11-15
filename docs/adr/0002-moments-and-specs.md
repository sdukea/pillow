# ADR 0002: Moments, the visualization spec, and the expression language

**Status:** accepted, 2026-11-15

## Context

The tracer (ADR 0001) reports each line *before* it runs. That's the wrong
unit for teaching: learners need "this line ran, and this is what it did."
Specs and narration also need a way to read real state without running
arbitrary code.

## Decisions

1. **A moment is the transition a line causes.** It records the line that
   just ran (in the frame that ran it), the resulting state, and a precise
   list of changes: assign, rebind, push, pop, shift, set-item, dict-set,
   dict-delete, set-add, set-remove, a field change (such as `node.next`
   being rewired), call, return, and exception.
2. **Moment 0 is the function body about to run**, with arguments bound.
   **Entering a call is a single moment** ("called f(...)"); the hop from a
   `def` line to the first body line is folded away because it teaches
   nothing.
3. **After a return, the caller's line gets the credit.** The assignment in
   `left = depth(root.left)` completes in that transition, so the change is
   diffed against the caller's frame in the previous step.
4. **Narration and focus are evaluated in the frame that ran the line, just
   after it ran.** Two helper names let narration tell situations apart:
   `_entered` (this moment started a call) and `_next_line`.
5. **A small, safe expression language, not `eval`.** It's a Python-flavoured
   subset: names, literals, indexing, attributes, `+ - * // %`, comparisons,
   `in` and `not in`, `and`/`or`/`not`, and `len`/`max`/`min`/`abs`. Results
   are traced values, formatted like Python's `repr`.
6. **View models carry all meaning; renderers stay generic.** Array (with
   pointers and a range), map, set, stack and queue, vars, linked list
   (stable order by heap id), tree (layout fixed once per trace, plus the
   value each call returned), and call stack.
7. **Playback is a pure reducer over a moment index.** Stepping back
   re-derives the view rather than undoing anything, so it's exact by
   construction. Step over and step out use call depth.
8. **Validation runs at build time on many random inputs**, not just the
   example. It checks that every view finds its data, and that every
   narration and focus expression evaluates on every moment where its line
   runs. At runtime, a narration that fails on an unforeseen custom input is
   skipped rather than crashing.

## Evidence

The interpreter tests check hand-verified moments for Two Sum, linked-list
rewiring, stack push/pop and recursive returns. They also validate all
seven MVP specs on about 1,700 random traces across repeated runs. The
validator caught a real content bug: Reverse Linked List narration that
read `cur.val` on an empty list.
