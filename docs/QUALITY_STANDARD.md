# Quality standard

## A change is done when

1. `npm run typecheck` is clean.
2. `npm test` passes: unit, content validation, ontology and curriculum.
3. `npm run e2e` passes on desktop and phone, including any journey the
   change touches.
4. `npm run build` passes.
5. UI changes have been checked in the browser at desktop and phone width,
   with no console errors and no horizontal scroll.
6. Docs say what changed: `IMPLEMENTATION_PLAN.md` gets the status and the
   evidence, and an ADR covers any decision.

Never report a test as passing without running it.

## Testing strategy

| Layer | What | Where |
|---|---|---|
| Tracer | CPython and Pyodide parity; errors as results | `engine/tracer/*.test.ts` |
| Interpreter | Spec validation on every step of every fixture | `engine/interpreter/*.test.ts` |
| Content | Coverage, legends, card lengths, complexity claims matching measurements | `src/content/*.test.ts` |
| Knowledge | Model rules, questions, recommendations | `src/knowledge/knowledge.test.ts` |
| Curriculum | Ontology integrity, week order, tiers, no invented identifiers, attribution | `src/curriculum/*.test.ts` |
| Solve | The checker against right, wrong, slow and broken solutions | `src/solve/check.test.ts` |
| Pipeline | Schema, validation, sandbox isolation | `pipeline/*.test.ts`, `engine/sandbox` |
| Journeys | Every lesson end to end; map; recall; solve; roadmap | `e2e/app.spec.ts` (desktop and phone) |
| Retention | FSRS parity with the reference implementation; review questions; the queue | `src/knowledge/fsrs.test.ts`, `src/review/review.test.ts` |
| Later | Scheduler time-zone tests (P8), an accessibility audit (P9) | |

## UI bar

- One idea per screen.
- Body text at least 15 px.
- Hit targets at least 44 px.
- Every marker explained (ADR 0014).
- Light and dark themes, both from tokens.
- Works at 375 px width.

## Content bar

See `LESSON_STANDARD.md`. Concept facts are teaching content: they must be
precise, short, and include costs.
