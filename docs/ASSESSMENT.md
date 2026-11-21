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
| Diagnostic placement | Cue recognition, prediction and complexity across weeks 1–7 | As above, adaptive stop | Designed (P5) |
| Explain it (free text) | Interview Mode | Rubric; AI-assisted, human-auditable | Designed (P7) |
| Reconstruction | Re-order or fill in the solution's lines | Exact | Designed (P6) |

## Diagnostic (P5)

About 12 questions, about 10 minutes. It walks the weekly concept order,
starting at week 1.

- **Mastered:** two correct answers on a concept's recognition and
  explanation questions mark it `emerging` for both.
- **Stop:** the diagnostic stops at the first week where the student
  misses two.
- **Placement:** the roadmap starts at that week.
- **Low stakes:** everything skipped stays reviewable, and the diagnostic
  only ever *adds* evidence.

## Integrity

- **Read-only results:** expected outputs come from the reference
  solution, run in the same sandbox; nothing the student types can change
  them.
- **Seeded inputs:** random inputs are seeded per problem, and filtered
  by the problem's precondition.
- **Endless loops:** a 200,000-line step limit stops them ("Too slow").
