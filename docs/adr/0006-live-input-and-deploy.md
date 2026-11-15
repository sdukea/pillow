# ADR 0006: Live custom input, and how LeetSee ships

**Status:** accepted, 2026-11-16

## Context

Lessons played precomputed traces of one example per problem. Learners need
to try their own inputs: the edge case they're unsure about, the tree shape
that breaks their intuition. The brief requires real execution (never
invented traces) and isolated execution that never runs on the app server.

## Decisions

1. **Live inputs run the same tracer, in Pyodide, in a module Web Worker.**
   It's the same `tracer.py` the build runs in CPython; the tracer tests
   check the two produce byte-for-byte identical traces. The worker is
   started lazily: when the learner opens the input form (to warm it up) or
   first presses Run. A plain lesson visit never downloads Python. Pyodide
   is self-hosted (`public/pyodide`), not loaded from a CDN.
2. **Only data crosses into Python, never code.** The input form produces
   tracer `args` for the fixed reference solutions. Parsing is strict and
   written by hand (no `eval`, no `JSON.parse` of arbitrary text into
   Python). Each problem declares its fields and limits in `problems.ts`.
   Examples: sorted without repeats for Binary Search, brackets only for
   Valid Parentheses, a reachable level-order tree for Maximum Depth. Errors
   name the field and say how to fix it.
3. **Limits keep every run drawable**: at most 12–16 items or characters, 15
   tree nodes, 8 list nodes, and numbers within ±9999. Behind them, the
   tracer stops at 4,000 steps, and the main thread terminates the worker if
   a run takes more than 8 seconds (45 seconds while Python first loads).
   The next run starts a fresh worker.
4. **Any input must narrate correctly, and that's tested.** A seeded
   generator makes valid random inputs for every problem. Every approach is
   traced on them, its spec is validated (narration and focus evaluate on
   every moment), and every step is drawn. The examples and edge cases must
   also round-trip through the parser.
5. **One input per visit, shared across approaches**, so a learner can
   compare brute force and the better approach on the same input. The
   lesson's edge cases are offered as one-click presets. While a run loads,
   or if it fails, the example stays on screen, dimmed, with the status
   above it.
6. **Ship as a static site on GitHub Pages**, built and deployed by GitHub
   Actions (`.github/workflows/deploy.yml`). Every push runs the trace
   build, the type check, unit tests and Playwright end-to-end tests first.
   CI pins Python 3.14 to match Pyodide. The app knows its base path
   (`/pillow/`); `404.html` is a copy of the app so deep links work without
   server rewrites.
7. **End-to-end tests run against the production build under the Pages
   base path**, on desktop Chrome, with a phone project for the
   layout-sensitive tests. They cover:
   - every chapter of every lesson opening from a deep link without console
     errors;
   - playback;
   - a custom input running in real Pyodide;
   - input errors and edge-case presets;
   - no sideways scrolling on a phone.

## Consequences

- No backend exists, so nothing can be attacked server-side, and hosting
  costs nothing. The cost is a few megabytes of Python the first time a
  learner runs their own input.
- Running a learner's *own code* (not just their input) is not supported.
  The same worker could do it, but it would need a stricter sandbox story:
  no network from the worker, and memory limits. That is deliberately left
  for later.
