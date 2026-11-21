# Lesson standard

What every Pillow lesson must contain. The **Built** column says whether
the schema (`src/content/lesson.ts`) and validator
(`src/content/validateLesson.ts`) enforce it today.

## The 20 parts

| # | Part | What it is | Built |
|---|---|---|---|
| 1 | What it teaches | Every concept from both approaches, with the student's state | Yes (overview) |
| 2 | Problem in our own words | Restated, never copied | Yes |
| 3 | Input, drawn | The example, as a picture | Yes |
| 4 | Constraints and what they imply | e.g. n ≤ 10⁴ allows O(n²) | Partly (`understand`) |
| 5 | Prerequisites | Concepts to know first, linked to their cards | Yes (overview, curriculum) |
| 6 | Brute force | The obvious correct idea, traced live | Yes |
| 7 | Why it's slow | Measured growth, and where the waste is (`card.waste`) | Yes |
| 8 | Prediction | A question generated from the trace, before the change | Yes |
| 9 | Reasoning to the trick | Socratic steps with misconception-tagged choices and a hint ladder | Yes |
| 10 | The trick | One line (`card.trick`) | Yes |
| 11 | Optimal solution | Traced live, with a legend for every marker | Yes |
| 12 | Line by line | A note on every line | Yes (validated coverage) |
| 13 | Invariant / why it's correct | What stays true, and why the answer follows | **P3** |
| 14 | Complexity | Time and memory, measured, with the reason | Yes (measured, checked against the claim) |
| 15 | Edge cases | One-click inputs | Yes |
| 16 | Write it yourself | Tested against the reference, growth-checked | Yes (Python) |
| 17 | How to recognise it | Cues in the wording (`card.recognize`) | Yes |
| 18 | Variants and follow-ups | What an interviewer asks next, and what changes | **P3** |
| 19 | Related problems | Same concept, harder or different shape | **P3** (from the curriculum's tags) |
| 20 | Note and review | A recall card scheduled for review | Yes |

## Rules

- **Measured, not claimed:** complexity claims must match measured growth.
  The build fails otherwise.
- **Explained:** every visual marker needs a legend entry. Every step
  needs narration, checked on every step.
- **Lengths:** card lines are length-limited, so each says one thing.
- **Concepts:** every approach is tagged with real concepts.
- **Wrong answers diagnose:** every wrong reasoning choice names its
  misconception.
- **Reviewed:** AI-drafted lessons pass the five sandbox checks *and* need
  a named human reviewer to be promoted (ADR 0008).

## Building the next 199

The library JSON (`LibraryEntry`) is the scalable format. Each lesson goes
through:

1. Draft with the pipeline: `npm run draft -- <slug>`.
2. Pass the five checks.
3. Get a human review.
4. Promote, with a named reviewer.
5. Flip the problem's `lesson` status to `built`.

The pipeline needs an API key, provided by the user; it is never stored in
the repo or the frontend.
