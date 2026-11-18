# ADR 0011: Evidence, not exposure — the student model and the knowledge map

**Status:** accepted, 2026-11-18

## Context

Pillow could show a student anything but knew nothing about them. Every
surface was consumption, and the only answers a student could give (the
optional checks in the full lesson) were never saved. So it couldn't
tell a student who had **seen** a solution from one who **understood**
it. A knowledge graph built on that would have been decoration.

## Decisions

1. **A curated concept ontology** (`src/knowledge/concepts.ts`). It has 26
   concepts, from arrays and loops to recursion on trees, each with a
   one-line meaning and its prerequisites. Every lesson approach is tagged
   with the concepts it exercises. The build rejects unknown tags and
   prerequisite cycles, and AI drafts must tag their approaches from the
   same list.
2. **Graded tasks, generated rather than written,** so every problem
   gets them, including AI-drafted ones:
   - **Prediction from real traces.** Each run pauses once and asks what
     happens next: where a pointer moves, which node is visited, what
     ends up on top of the stack. It's asked right before the change,
     preferring surprising moves (a reset, a jump, a pop). The answer is
     what the code actually did.
   - **Growth.** "If the input were twice as long, this way would take…",
     graded against the growth the build *measured*. When there's no
     honest plain-words answer (n log n), the question isn't asked.
   - **Recall.** Notes on Home ask you to pick the problem's trick from
     three: its own and two other problems' tricks.

   In the learn flow, moving on is locked until you've answered.
   Answering wrong is fine; skipping isn't possible.
3. **An append-only evidence log** (`src/knowledge/evidence.ts`). Each
   entry is `{at, task, problem, approach, concepts, correct, hinted,
   detail}`. Watching a run to the end is logged as exposure, which is
   never graded. The log lives in the browser for now, in a shape meant
   to sync to a server unchanged.
4. **An explainable student model** (`src/knowledge/model.ts`): a pure
   function from the log to one state per concept. There are no
   percentages, and every state comes with the evidence behind it and one
   sentence saying why.
   - **seen:** exposure only.
   - **learning:** has answers, not yet enough.
   - **shaky:** the latest answer was wrong.
   - **understood:** two right answers without hints, from different
     tasks or problems, the latest right, **and** either *retention*
     (right in sessions at least 8 hours apart) or *transfer* (right in
     two different problems). The retention-or-transfer condition was
     added after a walkthrough marked three concepts understood from
     answers given seconds after seeing the trick.
   - **Review:** understood concepts come back on a doubling schedule (1,
     2, 4, 8… days).
5. **Recommendations are deterministic, with a reason**
   (`src/knowledge/recommend.ts`): first a concept you missed, with the
   problem that tested it; then reviews that are due; then the frontier,
   meaning problems that teach something new with the fewest unmet
   prerequisites. Home shows exactly one ("Start here", "Next", "Fix" or
   "Review").
6. **The knowledge map** (`/map`). Concepts are laid out in columns by
   prerequisite depth and coloured by state. Tapping one lights up what
   it builds on and shows its state, the reason, the evidence ("✓ Where
   does `lo` point next? → index 6 · Binary Search · 1 min ago"), its
   prerequisites' states, and the problems that practise it.

## Consequences

- The map is honest by construction. A concept turns green only when the
  evidence says so, and the student can see why.
- With six problems, transfer is rare, so most concepts reach
  "understood" through retention: recalling them on a later day. That's
  the intended loop for returning to Pillow.
- Prediction tasks test reading the algorithm, not deriving it.
  Deriving comes next (M9): Socratic questions whose wrong answers are
  tagged with misconceptions, and hints that weaken the evidence a right
  answer gives.
