# Assessment

How Pillow measures what a student knows. (The original LeetSee product
assessment moved to `docs/history/LEETSEE_ASSESSMENT.md`.)

## Principles

- **Evidence comes from answers and code.** Self-ratings are never
  recorded as evidence.
- **Generated from real runs:** questions are built from traces and
  measured growth, so their answers are true by construction.
- **Wrong answers diagnose:** a choice can name the misconception behind
  it.
- **Fair options:** answer order is shuffled per problem and step.
- **Hints are honest:** using one weakens the evidence, and the student is
  told so.

## Question types

| Type | Source | Grading | Status |
|---|---|---|---|
| Predict the next state | The trace, one or two moments before a change; prefers surprising moves | Exact match with the real run | Built |
| How does it grow? | Measured growth of each approach | Against the classified measurement | Built (n log n skipped) |
| Recall the trick | The note; distractors are other problems' tricks | Frozen when asked; exact choice | Built |
| Reasoning step | Hand-written per lesson | Choice; misconception-tagged | Built (6 lessons) |
| Write it yourself | Student code vs the reference, on the example, edge cases and 8 seeded random inputs | All pass, then growth as fast as the trick | Built (Python) |
| Placement check | Hand-written recognition and explanation questions, two per week | Exact choice; adaptive stop | Built (P5) |
| Mock interview | Clarify, approach and cost, hidden tests with a growth check, own-code cost, follow-up | Per stage (`src/interview/grade.ts`) | Built (P7) |
| Explain it (free text) | Interview Mode | Rubric; AI-assisted, human-auditable | Waits for a model |
| Review: when to use it | A concept's "use it when", with concepts of the same kind as distractors | Exact | Built (P6) |
| Review: the trick | A problem's trick among other problems' tricks | Exact | Built (P6) |
| Review: rebuild the solution | The next line of the real optimal solution; distractors only from later lines | Exact | Built (P6) |
| Review: how it grows | Measured growth of the optimal solution | Against measurement | Built (P6) |

## Placement check (built, P5)

At `/placement`, offered on Home to new students and on the roadmap as a
retake. It's a hand-written bank of 30 questions in
`src/diagnostic/questions.ts`, two for each teaching week:

- a **recognition** question ("which approach fits?");
- an **explanation** question ("how does it behave, or what does it
  cost?").

**Flow** (`src/diagnostic/flow.ts`), week by week from week 1:

1. Ask the recognition question. Right means the week is passed.
2. Wrong means the explanation question, as a second chance. Right means
   passed; wrong means stop.
3. **"I haven't learned this yet"** stops immediately.

The check takes 1 question for a beginner who stops at once, and at most
15 for a student who knows everything; at most two per week.

**What's recorded:**

- **Right answers only,** as `task: "diagnostic"` evidence with the facet
  and week. Wrong guesses aren't recorded, so beginners aren't marked
  "Needs work" on things they were never taught.
- **Placement from evidence:** the placement is re-derived from that
  evidence. It's the first teaching week with no right answer
  (`placementWeek`).
- **Dimensions:** diagnostic answers feed Spot it or Explain it by facet.
- **Never transfer:** they never count as transfer, so they can't make a
  concept Understood on their own.

**Tests:** every teaching week has both question types; questions only
test concepts taught by their week; four distinct choices; the flow's
branches.

## Integrity

- **Read-only results:** expected outputs come from the reference
  solution, run in the same sandbox; nothing the student types can change
  them.
- **Seeded inputs:** random inputs are seeded per problem, and filtered
  by the problem's precondition.
- **Endless loops:** a 200,000-line step limit stops them ("Too slow").
