# Implementation plan and tracker

The living plan. Update a milestone's status, with its completion evidence,
in the same commit that finishes it. `docs/PROJECT.md` is the session
log; this file is the plan.

## Phase 0 — Source audit (2026-11-22)

Audited by reading the code, running `tsc` (clean), 158 unit tests (all
pass), 35 end-to-end tests (all pass; 94 seconds in CI) and the
production build (passes; main bundle 581 KB).

### Current architecture

```
                        build time (Node + CPython)                                   browser (static site, GitHub Pages)
 engine/tracer/fixtures/*.py ─► tracer.py (sys.settrace) ─► traces ─┐        ┌─► interpreter: moments, changes, VizSpec → view models
 src/content/lessons/*.ts ──────────────────────────────────────────┼─► build ┤   React screens: Home · Learn (7 steps) · Map · Playground · Lesson
 engine/interpreter/fixtures/specs.ts (VizSpec per approach) ───────┘ validate│   Pyodide worker ─► same tracer.py: live inputs and students' own code
   validateSpec · measureLesson · validateLesson (coverage, complexity)       │   localStorage: evidence log, notes, drafts
                                                                              └─► knowledge: concepts · misconceptions · model · questions · recommend
 offline / server (Node 25+, never in the browser)
 pipeline/ (Claude drafts → 5 checks in engine/sandbox) ─► promote (named reviewer) ─► src/content/library/*.json
 server/ (Explain: identify → draft → check → run → cache; SSE) — not deployed anywhere
```

### Feature inventory

Status key: **Built** means implemented and tested. **Partial** means it
works but is incomplete. **Unverified** means it's built but has never
run for real. **Missing** means it isn't built.

| Area | Status | Evidence |
|---|---|---|
| Execution tracer, CPython and Pyodide, with a parity test | Built | `engine/tracer`, `tracer.test.ts` |
| Visualisations: array, pointers, window, map, set, stack, queue, linked list, tree, call stack | Built | `engine/interpreter`, `src/views` |
| Visualisations: graph, heap, DP table, union-find | **Missing** | not in `ViewSpec` |
| Lessons, each with a brute force and an optimal solution, line notes, measured complexity | Built for **6 problems** | `src/content/lessons` |
| Learn flow: overview → slow → your turn → trick → fast → write it → note | Built | `src/learn/Learn.tsx`; e2e tests |
| Trace-generated predictions, growth questions, recall | Built | `src/knowledge/questions.ts`; unit tests |
| Socratic reasoning, misconceptions, hint ladder | Built for 6 problems | `Lesson.reasoning`, `misconceptions.ts` |
| Independent coding: tests against the reference, growth check, debugger | Built (Python only) | `src/solve` |
| Evidence log, and an explainable student model (5 states) | Built | `src/knowledge/model.ts` |
| Six mastery dimensions | Built (P4) | `src/knowledge/dimensions.ts`, reference cards |
| Concept ontology | Built (P2): 55 concepts, 3 node kinds | `concepts.ts` |
| Knowledge map: list, graph, reference cards | Built | `src/map` |
| Recommendations (fix, review, frontier) | Built | `recommend.ts` |
| Spaced review | Built (P6): FSRS-6, four review kinds, refresher, history | `src/knowledge/fsrs.ts`, `src/review` |
| FSRS scheduling, multiple recall types, remediation | Built (P6) | `/review` |
| Curriculum (16 weeks, 205 problems, dependency graph), roadmap | Built (P2) | `src/curriculum`, `src/roadmap` |
| Placement check (diagnostic onboarding) | Built (P5) | `src/diagnostic` |
| Interview mode | **Missing** | |
| Notifications and email | **Missing** (needs a backend) | |
| Accounts, a database, cross-device persistence | **Missing**: everything is in `localStorage` | |
| AI drafting pipeline and sandbox | Built, **unverified live** (no API key) | `pipeline/`, `engine/sandbox` |
| Explain server (new problems) | Built, **unverified live**, not deployed | `server/` |
| CI: typecheck, unit tests, e2e, Pages deploy | Built | `.github/workflows/deploy.yml` |

### Data models today

- **Lesson** (`src/content/lesson.ts`), built per problem:
  - `card` (four short lines) and `reasoning` steps;
  - `understand`;
  - per approach: concepts, legend, notes per line, measured complexity
    and a check;
  - `compare`, `growth` and edge cases.
- **Problem** (`src/content/problems.ts`): the slug, the LeetCode number,
  the pattern, the example, input fields and rules, approaches (a fixture
  solution and its VizSpec), the lesson and its provenance.
- **Evidence** (`src/knowledge/evidence.ts`): `{at, task, problem,
  approach, concepts, correct, hinted, misconception, detail}`. Append-only,
  in `localStorage`.
- **ConceptState** (`model.ts`): derived, never stored. It has a state, a
  review time, the evidence behind it, its misconceptions and a reason.

### User journeys that work today

- **Search to problem:** search → a built problem → the 7-step lesson,
  with evidence → note → Home recommendation.
- **The map:** reference cards, and practising from them.
- **Playground:** custom inputs and racing both solutions.
- **Full lesson:** chapters with notes on every line.
- **Explain:** for problems that aren't built in. It needs the server and
  a key, and currently reports that plainly.

### Technical debt

1. **Bundle size.** Every trace is imported eagerly (581 KB). This won't
   scale to 200 problems; load traces per problem.
2. **Three overlapping problem screens:** Learn, Playground and the full
   Lesson. Learn is the front door. Keep the other two, but stop growing
   them.
3. **Lesson content lives in TypeScript files.** Fine for 6 lessons, heavy
   for 200. The library JSON format (`LibraryEntry`) is the scalable path.
4. **Local e2e runs can be slow or fail strangely** when an old
   `vite preview` is still listening on port 4173. Playwright reuses it
   (`reuseExistingServer`), so tests run against a stale build. Free the
   port (`lsof -iTCP:4173`) and a full run takes about 2 minutes. CI is
   unaffected.
5. **The student model is one-dimensional.** It conflates recognising,
   explaining and implementing a concept.

### Must preserve

The tracer and its parity test, VizSpecs and spec validation,
measurement-backed complexity claims, evidence-only mastery, the sandbox
and drafting pipeline, the learn flow, and CI.

### Scalability risks

- **Bundle growth** (see debt 1).
- **Unbounded `localStorage`:** the evidence log is capped at 5,000
  entries.
- **The Explain server's file cache** on one disk.
- **AI drafting cost** per lesson. That's one-off, but it needs budgeting.

### Security and privacy risks

- **Student data:** none leaves the browser today, so the risk is low.
  Accounts will change that; see `SECURITY.md`.
- **Untrusted code runs only in sandboxes.** Students' code runs in their
  own browser worker; AI drafts run in the Node permission sandbox. Keep
  it that way.
- **The API key is server-side only.** The server isn't deployed yet.

## Milestones

Each milestone lists its scope, dependencies, files affected, acceptance
criteria, tests, risks, and its completion evidence when done.

### P1 — Product foundation (docs)
- **Scope:** the PRODUCT_SPEC, ARCHITECTURE, CONCEPT_ONTOLOGY,
  MASTERY_MODEL, LESSON_STANDARD, ASSESSMENT, INTERVIEW_MODE, NOTIFICATIONS,
  SECURITY, QUALITY_STANDARD and CURRICULUM documents.
- **Accept:** each describes what is built and what is designed, clearly
  separated.
- **Status:** done 2026-11-22. Completion evidence: `docs/PRODUCT_SPEC.md`,
  `ARCHITECTURE.md`, `CONCEPT_ONTOLOGY.md`, `CURRICULUM.md`,
  `LESSON_STANDARD.md`, `MASTERY_MODEL.md`, `ASSESSMENT.md`,
  `INTERVIEW_MODE.md`, `NOTIFICATIONS.md`, `SECURITY.md` and
  `QUALITY_STANDARD.md`.

### P2 — Curriculum manifest and full ontology
- **Scope:**
  - expand the ontology to cover the whole syllabus, with node kinds;
  - a versioned problem manifest of 205 problems (Blind 75, NeetCode 150
    and Grind 169, deduplicated), each with its slug ID, official URL,
    difficulty, primary and secondary concepts, tier, week, prerequisites,
    lesson status and review status;
  - a 16-week plan, ordered by concept dependencies;
  - a roadmap screen.
- **Depends on:** P1.
- **Files:** `src/knowledge/concepts.ts`, `src/curriculum/*`,
  `scripts/build-curriculum.ts`, `src/roadmap/*`, tests.
- **Accept:**
  - no fabricated IDs, numbers or URLs: every problem comes from a source
    list, and numbers only where verified;
  - every concept tag exists;
  - weeks respect prerequisites;
  - tiers are deterministic;
  - the roadmap shows the student's next actionable problem.
- **Tests:** manifest validation (uniqueness, URL shape, concepts,
  prerequisite order, tier counts); roadmap e2e.
- **Risks:** topic-to-concept mapping is automatic, so each problem is
  marked `review: "auto"` until a person reviews it.
- **Status:** done 2026-11-22. Completion evidence:
  - **Ontology:** 55 concepts (29 new) with node kinds.
  - **Curriculum:** 205 problems, with tiers of 75 core, 48 reinforcement
    and 82 stretch.
  - **Roadmap:** at `/roadmap`, linked from Home.
  - **Tests:** 16 new unit tests (`src/curriculum/*.test.ts`) and one e2e
    journey on desktop and phone. The full suite, typecheck and build are
    green.
  - **Moved:** the old LeetSee assessment is now in
    `docs/history/LEETSEE_ASSESSMENT.md`.

### P3 — Learning engine upgrades
- **Scope:**
  - a lesson schema for invariants, correctness and the related or
    follow-up sections;
  - visualisations for graphs, heaps, DP tables and union-find;
  - traces loaded per problem.
- **Depends on:** P2.

### P4 — Mastery dimensions
- **Scope:** exposure, recognition, explanation, implementation, transfer
  and retention per concept, each with its evidence transitions; reference
  cards show the dimensions.
- **Depends on:** P2.
- **Files:** `src/knowledge/dimensions.ts`, `src/map/KnowledgeMap.tsx`,
  `src/styles.css`, tests.
- **Accept:**
  - derived from evidence only;
  - hinted answers never count;
  - slipping only after solid;
  - two in a row to recover;
  - never contradicts the overall state;
  - shown with reasons on every reference card.
- **Status:** done 2026-11-22. Completion evidence:
  - **Unit tests:** 10 for dimensions (`src/knowledge/dimensions.test.ts`).
  - **E2E:** a journey seeding evidence and checking every level on the
    card, on desktop and phone.
  - **Checked in the browser.**
  - **Overall rule unchanged on purpose:** the overall Understood rule was
    deliberately left as it was (see `MASTERY_MODEL.md`).

### P5 — Diagnostic and adaptive roadmap
- **Scope:** an onboarding diagnostic (evidence, not self-report),
  learner-specific sequencing, skipping concepts the student has
  demonstrated, and recommendations driven by the roadmap.
- **Depends on:** P2 and P4.
- **Files:** `src/diagnostic/*`, `src/curriculum/{weeks,progress}.ts`,
  `src/knowledge/{evidence,model,dimensions,recommend}.ts`, Home, Roadmap,
  App, tests.
- **Accept:**
  - placement from right answers only, re-derived from evidence;
  - wrong guesses not recorded;
  - placement answers never count as transfer or understanding;
  - the roadmap and Home start at the placement;
  - each learner sets a start date.
- **Status:** done 2026-11-22. Completion evidence:
  - **The check:** a 30-question placement check at `/placement`.
  - **Unit tests:** 10 new (the question bank, flow branches, placement
    from evidence, diagnostic evidence in dimensions).
  - **E2E:** two new journeys (place at week 3; beginner stops at once),
    on desktop and phone.
  - **Checked in the browser:** the walk-through, the roadmap at week 3
    with Next = Longest Substring, and start dates moving every week.

### P6 — Retention
- **Scope:** an FSRS-based scheduler, recall task types (concept,
  pattern, reconstruction, complexity, implementation), remediation,
  review history.
- **Depends on:** P4.
- **Files:** `src/knowledge/fsrs.ts`, `src/knowledge/{model,evidence,dimensions}.ts`, `src/review/*`,
  Home, map card, App, tests.
- **Accept:**
  - FSRS matches the reference step by step;
  - memory replayed from evidence, never stored;
  - four review kinds, each with exactly one true answer;
  - reconstruction never reveals the answer by elimination;
  - a miss shows the refresher;
  - review history.
- **Status:** done 2026-11-22. Completion evidence:
  - **FSRS:** parity with `fsrs4anki_scheduler.js @ ff7c85c` on an
    8-review golden sequence.
  - **Unit tests:** 14 new (FSRS, scheduling, review questions, queue,
    history, transfer rule).
  - **E2E:** a review journey on desktop and phone.
  - **Checked in the browser:** reconstruction, trick and concept
    questions, the refresher, the summary and history.
  - **Bug fixed:** P4's `.dim` class collided with faded answer choices
    (`.choice.dim`); renamed to `.mdim`.
  - **Implementation recall:** re-solving remains the existing "Write it
    yourself".

### P7 — Interview mode
- **Scope:**
  - timed and unseen problems, with clarifying questions;
  - explain your approach, implement it, run the tests, analyse the
    complexity, handle a follow-up, and defend it;
  - a report built from evidence.
- **Depends on:** P4 and P5.

### P8 — Accounts, persistence and notifications
- **Scope:** authentication, a per-user database, migrating the local
  evidence log, email reminders, preferences, quiet hours and time zones.
- **Depends on:** a hosting and provider decision (**needs approval:**
  external services).

### P9 — Quality and scale
- **Scope:** e2e journeys for each learner level, an accessibility audit,
  a security audit, performance, monitoring.
