# ADR 0019: Mock interviews on unseen problems, measured honestly

**Status:** accepted, 2026-11-23

## Context

Everything before P7 happens inside a lesson, where the problem has
already been explained. Interviews test something else: meeting a
problem cold, asking the right questions, choosing and costing an
approach, writing it under time, and handling a follow-up. Readiness by
April 2027 means practising exactly that.

## Decisions

1. **Unseen only.** An interview uses a problem the student has no
   evidence on and hasn't been interviewed on. The pool is separate from
   lessons, so lessons don't spoil it.
2. **Realistic: no hints, and no feedback until the end.** The
   interviewer answers the clarifying questions asked, nothing more.
3. **One checker for lessons and interviews.** `Checkable` (test inputs,
   reference, optional growth inputs and target) replaced the checker's
   dependence on lesson problems. Problems with inputs the generator
   can't make (lists of pairs) list enough hand-picked cases instead.
4. **"How does your code grow?" is graded against your code.** It's
   measured on growing inputs, not taken from the approach chosen
   earlier.
5. **Lower bounds keep measurement honest.** Line counting can't see
   work inside one line (`set()`, `sorted()`). Each problem declares the
   least work any correct solution needs. A measurement below that means
   the work was hidden, so speed and cost fall back to the chosen
   approach, and the report says why. Kth Largest was dropped from the
   pool because its natural solutions hide almost all their work.
6. **Evidence, not a score.** Each stage becomes `interview` evidence that
   feeds Spot it, Write it or Explain it, and counts as transfer.
   Readiness is the passes among the last five.

## Consequences

- Five problems is a small pool. More come with lessons and interview
  sets, and every problem needs a reference solution and real tests.
- Free-text defence (explain and justify out loud) needs a model to
  judge it, so it waits for a server-side key.
