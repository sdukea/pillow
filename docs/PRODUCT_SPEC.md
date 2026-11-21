# Product spec

## Who it's for

Students at our university preparing for software engineering interviews:
from beginners who've never solved a LeetCode problem, to students who can
solve Mediums but forget patterns weeks later.

## The promise

**Understanding you can show, and keep.** Pillow teaches each problem from
first principles. It records only what a student has *demonstrated*, keeps
that understanding alive with spaced review, and gets them ready for an
interview by **April 2027**.

## Principles

1. **Evidence, never self-report.** Watching isn't learning. A concept
   counts as understood only from answers and code.
2. **Every claim is checked.** Complexity is measured from real runs.
   Visualisations come from real execution. Solutions are tested.
3. **Clarity over volume.** One idea per screen, large type, every marker
   explained (ADR 0014).
4. **Retention is a feature.** Reviews are scheduled, not left to chance.
5. **Interview-shaped.** Every lesson ends in something an interviewer
   would ask.

## The six systems

| System | What it does | Status |
|---|---|---|
| A. Adaptive roadmap | A 16-week plan of 205 problems in dependency order; next actions from evidence | **Partial**: the plan, the roadmap screen and the next problem from evidence are built. Diagnostic and adaptive re-sequencing are P5 |
| B. Knowledge graph | A typed concept graph; each problem tagged; the student's state per concept | **Partial**: 55 concepts in 3 kinds, the map, reference cards and six mastery dimensions are built |
| C. Lesson engine | First-principles lessons: overview, brute force, reasoning, trick, fast way, write it, note | **Built for 6 problems**; the schema upgrade is P3; the 199 others are planned |
| D. Retention | Spaced review of concepts, patterns and code | **Partial**: a doubling schedule and recall notes. FSRS is P6 |
| E. Interview readiness | Timed, unseen problems; explain, code, analyse, defend; a report | **Designed** (`INTERVIEW_MODE.md`), P7 |
| F. Continuity | Accounts, devices, email reminders, quiet hours, time zones | **Designed** (`NOTIFICATIONS.md`, `SECURITY.md`), P8: needs provider approval |

## Core journeys

1. **First visit:** Home → Roadmap → Week 1 → Two Sum lesson. Built.
2. **Daily session:** Home shows Fix, Review or Next; do it; evidence updates
   the map and the roadmap. Built (single dimension).
3. **Diagnostic onboarding:** a short set of predictions and recall
   questions places a student who already knows the basics. P5.
4. **Weekly:** finish the week's core problems; the roadmap moves when the
   week's concepts are understood. Built (evidence-driven week).
5. **Interview prep:** Week 16 and beyond: timed mock interviews and a
   readiness report. P7.
6. **Coming back after a break:** reviews due first, then the frontier.
   Partly built (review recommendations); email nudges are P8.

## Success measures

- **Concepts understood**, by the model's evidence rules, per student per
  week.
- **Retention:** recall accuracy on scheduled reviews (target ≥ 85%).
- **Transfer:** first-attempt success on unseen problems that use
  understood concepts.
- **Interview readiness:** the share of mock interviews passed, by April
  2027.

## Out of scope for now

- Languages other than Python (ADR 0013).
- Copying LeetCode statements: problems are restated in our own words.
- Public leaderboards.
