# Pillow — living project document

Read this first in every session. Update it whenever something below changes.

_Last updated: 2026-11-20 (M10.1 clarity done)._

## Vision

Pillow is for university students who struggle to understand and solve
LeetCode problems. It should make them **genuinely better at thinking**,
and addicted to understanding. It does that by building five capabilities:

1. **Understanding:** first principles, constraints, the naive approach,
   the optimisation, invariants, correctness and complexity.
2. **Reasoning:** students derive solutions themselves through prediction,
   Socratic questions, hints and debugging.
3. **Visualisation:** real, interactive execution state for every problem.
4. **Knowledge mapping:** a persistent graph of what the student
   understands, grounded in evidence.
5. **Interview readiness:** solving independently, explaining, defending,
   analysing complexity, and handling variations.

**The central idea:** Pillow knows the difference between a student who has
**seen** something and one who **understands** it. Opening a problem, or
watching a solution, is never mastery.

## What Pillow is today (audit, 2026-11-18)

### Strong foundations to keep
- **Real execution, not animation.** A Python tracer (`engine/tracer`)
  runs identically in CPython at build time and in Pyodide in the
  browser, with a parity test. Every step of every visualisation is real.
- **Declarative visualisation specs** (`engine/interpreter`): arrays,
  pointers, windows, maps, sets, stacks, queues, linked lists, trees and
  the call stack. Narration is filled in from real values, and validated
  on every step.
- **Honest content checks** (`src/content/validateLesson.ts`). Every line
  that runs must be explained and narrated, and complexity claims must
  match measured growth.
- **An AI drafting pipeline behind deterministic checks** (`pipeline/`,
  `engine/sandbox/`). Untrusted Python runs in a sandbox (Node permissions
  and Pyodide), drafts go through five checks with a repair loop, and a
  person must review before publishing.
- **Live input:** students' own inputs are traced in a browser worker.
- **Tests:** 119 unit tests and 25 end-to-end tests, CI, and a GitHub
  Pages deploy.

### What the student actually does
They watch. Every surface is consumption:

| Surface | Student actions |
|---|---|
| Learn (5 beats) | press Next |
| Playground | edit inputs, scrub time |
| Full lesson | read; optional checks that aren't recorded |
| Notes | tap to reveal the trick (self-report) |

### Gaps, most important first
1. **No evidence.** Nothing a student does is graded *and* recorded. So
   Pillow can't know what they understand, and a knowledge graph today
   would be decoration. This is the root gap; everything else depends
   on it.
2. **No concept model.** Problems are tagged with one "pattern" string.
   There are no concepts, no prerequisites, no misconceptions, and no
   link between problems.
3. **No reasoning tasks.** Students are never asked to predict, derive,
   choose or implement before being shown.
4. **No independent solving.** Students never write code. Interview
   readiness can't be shown without it.
5. **Thin content.** Six problems. The AI pipeline can grow this, but it
   has never run against the live API (there's no key yet).
6. **Persistence is browser-only** (`localStorage`). That's fine for a
   pilot, but a university deployment needs accounts and sync eventually.
7. **Product thrash.** The front door changed four times in two days:
   chapters, then a film, then a playground, then five beats. Each change
   was driven by the interface. The fix is a stable learning loop that
   UI choices plug into, which is what this plan defines.

## What Pillow needs to become: the architecture

```
            ┌───────────── deterministic, testable ─────────────┐
 content    │ concepts.ts (ontology + prerequisites)            │
            │ lesson card, misconceptions, tasks per problem    │
            └────────────────────────┬──────────────────────────┘
                                     │
 interactions  graded tasks ─────────┼──► evidence log (append-only events)
 (learn flow)  predict · derive ·    │       │
               complexity · recall · │       ▼
               implement · explain   │    student model (pure function of the log)
                                     │       │   per concept: state + the evidence behind it
                                     │       ▼
 views                               └──► knowledge map · recommendations · review queue
```

1. **Concepts** (`src/knowledge/concepts.ts`): a hand-curated ontology of
   about 30 concepts with prerequisite edges, such as `hash-lookup` needing
   `hash-map`, or `binary-search-invariant` needing `sorted-order`.
   Problems and approaches are tagged with the concepts they teach and
   use. This is curated, not generated: the graph is only as good as its
   ontology.
2. **Graded tasks.** Every task produces evidence and none needs AI to grade:
   - **Prediction, generated from the real traces.** "Where does `i` go
     next?", "What's on top of the stack now?", "What does it return?"
     Answers come from execution, so they're always correct.
   - **Complexity:** "If the input doubles, the steps…", graded against
     *measured* growth.
   - **Recall:** "Which trick solves Two Sum?", with the other problems'
     tricks as the distractors.
   - **Later:** authored Socratic questions whose wrong answers are tagged
     with misconceptions; implementation, with your own code run against
     tests in the browser worker; and explanation, which can be AI-graded
     but only as weak evidence.
3. **Evidence log** (`src/knowledge/evidence.ts`): append-only events
   `{at, task, problem, concepts, correct, hinted, misconception?}`. Local
   for now, and the right shape to sync to a server later.
4. **Student model** (`src/knowledge/model.ts`): a *pure, explainable*
   function from the log to a state per concept, with no percentages:
   - **unseen**
   - **seen:** exposure only
   - **learning:** has attempts, not yet consistent
   - **understood:** at least two correct graded answers without hints,
     and the latest one correct
   - **shaky:** the latest attempt was wrong, or a misconception showed up
   - **review due:** spaced-repetition intervals on understood concepts

   Every state shows the evidence that produced it.
5. **Knowledge map** (`/map`): the concept graph laid out by
   prerequisites and coloured by state. Clicking a concept shows its
   evidence, the problems that teach it, and what to do next.
6. **Recommendations** (deterministic):
   1. reviews that are due;
   2. shaky concepts and misconceptions;
   3. the frontier: a problem whose prerequisites are understood and
      which teaches something new.

AI stays where it adds value: drafting new problems' content, and, later,
grading free-text explanations, always behind validation. The student
model never depends on an AI judgement alone.

## The first complete learning experience (target of M8–M10)

1. **Home:** your map, colour-coded, with one recommendation ("Continue:
   Two Sum") and any reviews due.
2. **A problem:**
   1. The problem, drawn.
   2. The slow way runs, and pauses for a prediction you have to answer.
   3. You derive why it's slow, through a Socratic question.
   4. The trick.
   5. The fast way runs, with a prediction.
   6. Complexity questions.
   7. You implement it, and your code runs against the tests.
   8. The note.
3. **Your map changes** because of what you answered, not because you
   opened the page.
4. **Coming back days later**, reviews are due and recommendations have
   moved on. Interview mode is a timed, unseen problem with no hints.

## Milestones

| | Milestone | Status |
|---|---|---|
| M0–M7.2 | Engine, lessons, live input, AI pipeline, Explain server, learn flow | Done |
| M8 | **Evidence:** concept ontology and tagging; trace-grounded prediction, complexity and recall tasks in the learn flow; evidence log; explainable student model; knowledge map; recommendations on Home | Done |
| M9 | **Reasoning:** authored Socratic derivation with misconception-tagged answers; a ladder of hints that lowers the evidence a correct answer gives; misconceptions on the map | Done |
| M10 | **Independent solving:** write the solution in the browser; tests run in the Pyodide worker (examples, edge cases, random inputs checked against the reference); "solved independently" evidence | Done |
| P1 | **Product foundation:** the spec, architecture, ontology, curriculum, lesson, mastery, assessment, interview, notification, security and quality docs | Done (2026-11-22) |
| P2 | **Curriculum:** 55-concept typed ontology; 205 problems (Blind 75, NeetCode 150, Grind 169) tiered and placed in a 16-week dependency-ordered plan; the roadmap at `/roadmap` | Done (2026-11-22) |
| P4 | **Mastery dimensions:** exposure, recognition, explanation, implementation, transfer and retention per concept, from evidence, with reasons on each reference card | Done (2026-11-22) |
| P5 | **Placement and adaptive roadmap:** a 30-question placement check (right answers only become evidence); the roadmap and Home start from the placement and follow the current week; per-learner start dates | Done (2026-11-22) |
| P3, P6–P9 | The lesson schema and new views, FSRS retention, interview mode, accounts and notifications, quality and scale | Planned: see `docs/IMPLEMENTATION_PLAN.md` (it supersedes M11–M13) |

## Key decisions (see `docs/adr/`)
- 0001–0007: engine, specs, lessons, honest first approaches, live input, the AI pipeline.
- 0008–0010: Pillow; the playground; one idea, then a note.
- M8: no mastery percentages. Mastery is an explainable state backed by
  evidence. Prediction tasks are generated from real traces rather than
  written by hand, so they scale to every problem the pipeline produces.

## Current state (2026-11-20, M10 done)
Each problem now runs through seven steps:

1. the problem, drawn;
2. the slow way, with a prediction and a growth question;
3. **Your turn**: Socratic questions, misconceptions and hints;
4. the trick;
5. the fast way, with a prediction and a growth question;
6. **Write it yourself**;
7. the note.

**Write it yourself (ADR 0013):**
- **Cases:** the example, the edge cases and 8 seeded random inputs that
  satisfy the precondition, compared with the reference solution. Answers
  are order-free where order doesn't matter.
- **Runs** in the Pyodide worker, with a step limit.
- **Errors:** syntax and runtime errors come back with line numbers.
- **Debugging:** failing cases open in a step-through debugger.
- **Speed:** a solution that passes is classified by measured growth
  against the trick's.
- **Evidence:** `implement` is correct only when the solution is as fast
  as the trick, and `hinted` if a solution was shown.

Tests: 158 unit and 33 end-to-end (about 1 minute).

Earlier milestones: M8 was evidence, the model and the map (ADR 0011);
M9 was reasoning and misconceptions (ADR 0012).

**M10.1, the clarity pass (ADR 0014):**
- Problems open with an overview of what they teach, with the student's
  state on each concept.
- Runs have a heading, a hand-written legend for every marker, the full
  visualisation scaled up, one large explanation per step, steady pacing
  (no fast-forward), and a large stepper.
- The narrations that fire on every loop were rewritten to say what's
  compared.
- The map defaults to a grouped list. Each concept is a reference card
  (key facts, use it when, common mistakes, practise with, builds on,
  evidence), and `/map?c=` links to it.
- End-to-end tests play runs at 40×.

**Next: M11, interview mode.**
- An unseen problem from the library, chosen from concepts the student
  hasn't proven.
- Timed, with no hints and no lesson.
- They state their approach and its complexity, then implement it.
- A follow-up variation.
- A readiness view built only from interview evidence:
  - solved independently, on time;
  - complexity stated correctly;
  - the variation handled.
- New evidence types: `interview-solve`, `interview-explain`.

**Still open:** which language students practise in (only Python is
supported). Accounts and sync are needed before a real university pilot.

## Reference material
Seven research repositories are cloned outside the repo: visualisers,
interview handbooks, algorithm references, and FSRS for review scheduling.
See `docs/REFERENCES.md` for where they are, what each is useful for, and
the licensing rules (MIT is reusable with notice; CC BY-SA content isn't to
be copied into lessons).

## Outstanding issues
- Locally, `npm run e2e` can take 15+ minutes. The tests themselves finish in about 2 minutes, but Chrome is slow to close between workers. This was seen while the local Chrome had an update waiting for a relaunch. In CI, the same suite takes about 90 seconds.
- No Anthropic API key, so Explain and AI drafting haven't run live.
- No host for the API server; the public site is static.
- On a phone, the playground's two solutions stack instead of sitting side by side.
- Which language do students implement in? It matters for M10, and Python is the default today.
