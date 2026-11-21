# Mastery model

## Built today (`src/knowledge/model.ts`)

There is one state per concept, derived on every render from the evidence
log. It's a pure function, and no hidden score is stored.

| State | Rule |
|---|---|
| Not met yet | No evidence |
| Seen | Watched only (`exposure`) |
| Learning | Has answered, but isn't consistently right yet |
| Needs work | The most recent answer was wrong, or showed a misconception |
| Understood | Meets all three conditions below |

For **Understood**, all of these must hold:

1. At least 2 correct, unhinted answers, from different tasks or problems.
2. The latest answer is correct.
3. Either **retention** (correct in sessions at least 8 hours apart) or
   **transfer** (correct in two different problems).

Understood concepts come back for review after 1, 2, 4, 8… days.

**Evidence tasks:**

- `exposure`
- `predict`
- `complexity`
- `recall`
- `reason`
- `implement`

Each records `correct`, `hinted` and `misconception`.

## Designed: six dimensions (P4)

One state hides real differences: a student can recognise a sliding window
without being able to write one. Each concept gets six dimensions, each
fed by specific evidence.

| Dimension | Question it answers | Evidence that moves it |
|---|---|---|
| Exposure | Has the student met it? | `exposure` (watched a run, opened the card) |
| Recognition | Do they know when it applies? | `recall` (which trick fits), `reason` steps that pick the approach, diagnostic cue questions |
| Explanation | Can they say why it works and what it costs? | `complexity`, `predict`, `reason` steps about the invariant |
| Implementation | Can they write it? | `implement`: passing, fast enough, unhinted |
| Transfer | Can they use it on a problem they haven't been taught? | Correct `implement` or `reason` on a problem whose lesson they haven't seen, and Interview Mode |
| Retention | Do they still have it later? | Correct reviews spaced by the scheduler (P6) |

### Transitions

Each dimension has its own state: none, emerging, solid or slipping. The
transitions are:

- **none → emerging:** the first correct, unhinted piece of evidence.
- **emerging → solid:** two correct, unhinted answers from different
  problems or sessions, with the latest one correct.
- **solid → slipping:** a wrong answer or a misconception, or (for
  retention only) a review that's overdue.
- **slipping → solid:** two correct answers in a row.

Hinted answers count toward exposure only. Misconceptions flag the
dimension the question tested.

**Understood** (the overall state) will mean that recognition,
explanation and implementation are solid, and transfer or retention is
solid. That's the current rule made explicit. The map and reference cards
will show the six as a row of marks, each with its reason.

### Migration

The evidence log already carries `task`, so the dimensions derive from
existing data, with no migration needed. Tests will check that the
overall state never becomes *more* generous than today's.
