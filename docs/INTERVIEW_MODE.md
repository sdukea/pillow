# Interview mode (built, P7)

At `/interview`, linked from Home. Code: `src/interview/`.

## What it simulates

A technical interview on a problem the student hasn't met.

- **Unseen:** no evidence on the problem, and no earlier interview on
  it.
- **Choosing:** of the unseen problems, it picks the latest one the
  student's roadmap week has reached, or otherwise the earliest left
  (`nextInterview`).
- **The pool:** five problems with no lesson, each with a reference
  solution and real tests: Contains Duplicate, Climbing Stairs, Unique
  Paths, Course Schedule and Redundant Connection. The slugs come from
  the curriculum's source lists (tested).

No hints, and no feedback until the end. Leaving mid-interview records
nothing.

## Stages

| # | Stage | Suggested | The student | Graded |
|---|---|---|---|---|
| 1 | Clarify | 3 min | Picks questions to ask; the interviewer answers them | Pass: every question that changes the solution, and at most one that doesn't |
| 2 | Approach | 5 min | Picks an approach and states its running time | Pass: an optimal approach with the right cost. Partly: working but slower, or a wrong cost |
| 3 | Write it | 20 min | Writes Python; runs the example freely; submits to hidden tests | Pass: every test passes, and measured growth is as good as optimal. Partly: correct but slower |
| 4 | Its cost | 2 min | States how *their own code* grows | Checked against their code's measured growth |
| 5 | Follow-up | 5 min | Answers one variant question | Pass or miss, with the reason |

The timer guides rather than punishes: running over turns the clock
amber, and each stage's time is reported.

## Honest measurement

Pillow measures growth by counting lines run, so work inside one line
(`set(nums)`, `sorted()`) counts as one step.

- **The lower bound:** each problem declares the least work any correct
  solution needs.
- **Below it:** a measurement below the bound means the work was hidden.
- **Then:** speed and the cost answer are judged against the approach the
  student chose, and the report says so in plain words.
- **Kth Largest** was left out of the pool because heap and sort
  solutions hide nearly all their work this way.

## Report and evidence

Each stage shows pass, partly or missed, with its reason and time. The
report also reveals:

- the questions that mattered, with their answers;
- the optimal approach;
- a reference solution;
- the concepts involved, linked to their cards.

Each stage is recorded as `task: "interview"` evidence with its `stage`:

- **Clarify and approach** feed *Spot it*.
- **Write it** feeds *Write it*.
- **Cost and follow-up** feed *Explain it*.
- **Transfer:** the problem is unseen, so the evidence also counts as
  transfer.

## Passing and readiness

- **Passed:** approach, code and cost all pass, and clarify and the
  follow-up aren't missed.
- **Readiness:** the number passed among the last five interviews, shown
  on the interview page.

## Not yet

- **Free-text explanations** (defend your approach) need a model to judge
  them, so they wait for a server key.
- **More problems** come as lessons and interview sets are added.
