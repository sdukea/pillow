# Pillow — living project document

Read this first in every session. Update it whenever something below changes.

_Last updated: 2026-11-18 (M8 done)._

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
| **M9** | **Reasoning:** authored Socratic derivation with misconception-tagged answers; a ladder of hints that lowers the evidence a correct answer gives; misconceptions on the map | Next |
| M10 | **Independent solving:** write the solution in the browser; tests run in the Pyodide worker (examples, edge cases, random inputs checked against the reference); "solved independently" evidence | |
| M11 | **Interview mode:** an unseen problem, timed, no hints, explain your approach and complexity, a follow-up variation; a readiness view built from that evidence | |
| M12 | **Accounts and sync:** a university pilot across devices; the evidence log syncs to the server | |
| M13 | **Scale content:** the AI pipeline drafts concept-tagged problems with tasks; reviewed before publishing | |

## Key decisions (see `docs/adr/`)
- 0001–0007: engine, specs, lessons, honest first approaches, live input, the AI pipeline.
- 0008–0010: Pillow; the playground; one idea, then a note.
- M8: no mastery percentages. Mastery is an explainable state backed by
  evidence. Prediction tasks are generated from real traces rather than
  written by hand, so they scale to every problem the pipeline produces.

## Current state (2026-11-18)
**M8 is done** (ADR 0011):
- **Concepts:** 26, with prerequisites; every approach is tagged.
- **Graded tasks generated from real traces:** a prediction in every run, a
  growth question graded against measured growth, and recall in notes.
  Moving on is locked until you answer.
- **An append-only evidence log, and an explainable student model.**
  "Understood" needs retention or transfer, never one sitting.
- **Recommendations** on Home, and the knowledge map at `/map`.
- **Tests:** 147 unit tests and 28 end-to-end tests. In the e2e suite, runs
  play 10× faster through the `pillow.speed` setting the tests put in
  storage; it's always 1× for people.

A bug the e2e suite caught: recalling the right trick could be marked wrong.
Recording the answer re-shuffled the choices. Questions are now frozen
when asked.

**Next: M9, Reasoning.**
- An authored Socratic step per problem ("What work is the slow way
  repeating?"), whose wrong answers are tagged with misconceptions.
- A ladder of hints that marks answers as hinted, which is weaker evidence.
- Misconceptions shown on the map, and recommendations that target them.
- New content fields: `socratic` and `misconceptions` per lesson,
  validated, with AI drafts writing them too.

## Outstanding issues
- No Anthropic API key, so Explain and AI drafting haven't run live.
- No host for the API server; the public site is static.
- On a phone, the playground's two solutions stack instead of sitting side by side.
- Which language do students implement in? It matters for M10, and Python is the default today.
