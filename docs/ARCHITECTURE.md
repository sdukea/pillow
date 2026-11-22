# Architecture

## Today

```
 BUILD TIME (Node + CPython)
   engine/tracer/tracer.py ── sys.settrace ──► traces for every fixture solution
   validateSpec · measureLesson · validateLesson ──► the build fails on any broken claim
   scripts/build-curriculum.ts ──► src/curriculum/sources.json  (attributed, committed)

 BROWSER (static site on GitHub Pages; no server needed)
   React 19 screens
     Home ─ Roadmap ─ Learn (overview → slow → your turn → trick → fast → write it → note)
          ─ Map (list · graph · reference cards) ─ Playground ─ full Lesson
   engine/interpreter   traces → moments → VizSpec view models → src/views
   Pyodide worker       the same tracer.py: live inputs, students' own code (step-limited)
   src/knowledge        concepts · misconceptions · evidence log · model · questions · recommend
   src/curriculum       205-problem plan · weeks · roadmap position from evidence
   localStorage         pillow.evidence · pillow.notes · drafts · preferences

 OFFLINE / SERVER (never in the browser)
   pipeline/   Claude drafts → 5 checks in engine/sandbox → human review → src/content/library
   server/     Explain: identify → draft → check → run → cache (SSE). Not deployed
```

## Module boundaries

- **`engine/`:** pure execution and interpretation. It has no React and no
  product logic.
- **`src/knowledge/`:** pure functions of the evidence. All mastery logic
  lives here, so the server can reuse it for notifications.
- **`src/curriculum/`:** pure data and functions. It depends on
  `knowledge` and `content`, never on UI.
- **`src/content/`:** lessons and problems; validation runs in tests and
  at build time.
- **UI folders** (`home`, `learn`, `map`, `roadmap`, `solve`, `play`,
  `lesson`): rendering and interaction only.

## Proposed (P3–P9)

```
 Browser ──HTTPS──► API (P8)                         Scheduler (P8)
   │                 ├ auth (managed provider)         every 15 min: due reviews,
   │                 ├ evidence sync (append-only)     weekly plan → email provider
   │                 ├ preferences                      uses src/knowledge (shared)
   │                 └ interview reports
   │                        │
   │                   Postgres (row-level security)
   │                     users · evidence · preferences · send_log · interviews
   └─ localStorage stays the offline cache; it syncs when signed in
```

### Data model (proposed)

| Table | Fields |
|---|---|
| `users` | id, email, display name, time zone, plan start, created at |
| `evidence` | user id, at, task, problem, approach, concepts[], correct, hinted, misconception, detail (append-only: the same shape as today's `Evidence`) |
| `preferences` | user id, per-type email toggles, quiet hours, delivery time |
| `interviews` (P7) | user id, problem, started at, stages JSON, result |
| `send_log` (P8) | user id, type, local date (unique), sent at, provider ID |

Everything that decides a student's state stays a pure function of their
evidence. The database stores facts, never derived scores, so the rules
can improve without migrations.

## Scaling notes

- **Traces load per problem** (P3) instead of eagerly, keeping the bundle
  flat as lessons grow.
- **Lessons ship as library JSON,** lazy-loaded per route.
- **The curriculum JSON** is about 67 KB uncompressed, and only the
  roadmap and Home's recommendation use it.
