# ADR 0016: A placement check that only records what you got right

**Status:** accepted, 2026-11-22

## Context

The roadmap started everyone at week 1. A student who already knows
hashing and two pointers would spend weeks proving it. The brief asked
for onboarding based on evidence, not self-report.

## Decisions

1. **Hand-written questions, two per teaching week:** recognition first,
   then explanation as a second chance.
   - **Accuracy:** placement decides a student's first month, so its
     questions are curated like concept facts and checked by tests. Every
     week is covered, and questions only test concepts taught by then.
2. **An adaptive stop.**
   - **Where it stops:** two misses in a week, or "I haven't learned this
     yet", stops the check.
   - **Length:** 1 to 15 questions; a beginner is done in seconds.
3. **Only right answers become evidence.** A beginner guessing wrong
   isn't a misconception, and marking untaught concepts "Needs work"
   would fill Home with Fix items they can't act on. Wrong answers only
   end the check.
4. **The placement is derived, never stored.**
   - **The rule:** the roadmap's start is the first teaching week with no
     right placement answer.
   - **The flag:** `pillow.placement` only records that the check was
     taken, so Home stops offering it.
5. **Placement answers are weaker evidence.** They feed Spot it or
   Explain it by facet, but never transfer, so the check alone can't make
   anything Understood.
6. **Home follows the roadmap.** The frontier prefers problems at or
   after the current week. The weeks moved to `weeks.ts`, so Home doesn't
   load the 205-problem lists.
7. **Each learner sets their own start date** on the roadmap. It's a
   preference, not evidence.

## Consequences

- A student who knows week 5 but not week 3 is placed at week 3. That's
  deliberate, because later weeks build on earlier ones. They can still
  open any week's problems.
- Placing past a week doesn't mark its concepts Understood, so those
  concepts still appear on the map as Learning until they're used in a
  lesson.
