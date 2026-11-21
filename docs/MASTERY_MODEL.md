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

## Built: six dimensions (P4, `src/knowledge/dimensions.ts`)

One state hides real differences: a student can recognise a sliding window
without being able to write one. Each concept has six dimensions, derived
from the same evidence log. They're pure functions, and nothing is stored.

| Dimension | On the card | Question it answers | Evidence that moves it |
|---|---|---|---|
| Exposure | Met it | Have you come across it? | Any evidence |
| Recognition | Spot it | Do you know when it applies? | `recall` (which trick fits this problem); placement recognition questions |
| Explanation | Explain it | Can you say how it behaves and what it costs? | `predict`, `complexity`, `reason`; placement explanation questions |
| Implementation | Write it | Can you code it, fast enough? | `implement` (passes, and is as fast as the trick) |
| Transfer | Use it elsewhere | Can you use it in more than one problem? | Correct, unhinted answers in two different problems (placement answers don't count) |
| Retention | Keep it | Do you still have it later? | Correct, unhinted answers in sessions at least 8 hours apart; slips when a review is overdue |

### Levels and transitions

| Level | On the card | Meaning |
|---|---|---|
| none | Not yet | No correct, unhinted answer yet |
| emerging | Started | At least one correct, unhinted answer; not yet solid |
| solid | Solid | The dimension's bar is met: two correct answers from different questions (for transfer, different problems; for retention, sessions at least 8 hours apart), and the latest answer is correct |
| slipping | Slipping | The latest answer was wrong *and* the dimension was solid before it, or (for retention) a review is overdue |

- **Back from slipping:** two correct answers in a row.
- **A miss before solid:** a wrong answer before a dimension was ever
  solid leaves it at Started, never Slipping.
- **Hinted answers:** they count toward exposure only.

Each dimension shows a one-sentence reason drawn from the evidence, on the
concept's reference card under **What you've shown**.

### The overall state is unchanged, on purpose

The five-state rule above still decides Understood, the map's groups and
the roadmap's week. Requiring every dimension to be solid would be
stricter, but most concepts can't yet be tested on every dimension. For
example, few concepts have recall questions, and implementation evidence
comes from only six problems. So the stricter rule would stall the
roadmap for reasons the student can't act on.

A test guarantees that the two never contradict each other: an
understood concept always has transfer or retention solid. Tightening
Understood to need recognition, explanation and implementation is
revisited once the diagnostic (P5) and recall types (P6) give every
concept questions on each dimension.

### Migration

None was needed. The evidence log already carries `task`, so dimensions
derive from existing data.
