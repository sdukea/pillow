# Interview mode (designed, P7)

Nothing here is built yet. It depends on the mastery dimensions (P4) and
the diagnostic and adaptive roadmap (P5).

## What it simulates

A 45-minute technical interview on a problem the student hasn't been
taught: no lesson seen, no evidence on that problem. The problem is chosen
from the curriculum, using concepts the student has at `emerging` or
better.

## Stages

| # | Stage | The student | Evidence recorded |
|---|---|---|---|
| 1 | Clarify (3 min) | Picks clarifying questions from a list: some matter, some don't. Answers are revealed | Recognition (choosing the questions that change the approach) |
| 2 | Approach (5 min) | Chooses an approach and states its complexity *before* coding | Recognition, explanation |
| 3 | Implement (20 min) | Writes Python in the editor; runs their own tests | Implementation (same checker as Write it yourself, hidden cases) |
| 4 | Test | Picks edge cases to run; sees the results | Explanation |
| 5 | Complexity (2 min) | States time and memory | Checked against measured growth |
| 6 | Follow-up (5 min) | One variant ("what if the input is sorted?", "stream it"); chooses what changes | Transfer |
| 7 | Defend (optional) | Free-text explanation, rubric-scored. AI assistance only with a configured server key, never in the browser | Explanation |

## Report

Each stage gets pass, partial or miss, with the reason and the evidence.
The report also gives:

- time per stage;
- misconceptions shown;
- the concepts to review next.

All of it is stored as ordinary evidence (`task: "interview"`), so the
map and roadmap update. Mocks start in week 16 and continue afterwards.

## Readiness

The share of the last five mocks passed. A mock is **passed** when it gets
a pass on approach, implement and complexity, plus at least a partial
elsewhere. Shown on Home from week 12.

## Rules

- **Unseen problems only.** A problem whose lesson the student has opened
  can't be used.
- **No hints.** Opening anything else ends the mock as practice.
- **The timer guides, it doesn't punish:** running over is reported, not
  failed.
