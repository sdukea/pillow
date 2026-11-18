# Pillow

*Paste any LeetCode problem. Watch how to solve it.*

You type a problem (its name, its number or its link) and you're in a
playground, not a page of text:

- **The input is objects.** Drag a number to change it, drag it sideways
  to reorder it, drop it in the bin to delete it, or tap + to add one.
  Trees grow where you tap.
- **Both solutions race side by side** on that input, re-running real
  Python every time you change it. You drag time yourself.
- **Grow it.** Drag the size up and watch the gap open, with real
  measured numbers (×32 for Two Sum at 128).

Finishing a race saves the problem to your shelf. The full lesson, with
line-by-line explanations, is one tap away.

**Try it:** [sdukea.github.io/pillow](https://sdukea.github.io/pillow/)

## How it works

Every visualization comes from **real execution**, never an animation
someone scripted and never a sequence an AI made up:

```
reference solution ──► tracer (Python sys.settrace) ──► trace: every line, every variable, every object
                                                          │
                     visualization spec (per approach) ──►│──► interpreter ──► views: array · pointers ·
                     how to show the real state           │                   window · hash map · stack ·
                                                          ▼                   linked list · tree · call stack
                                                 narration rendered from the actual values at each step
```

- The **same tracer** runs at build time (CPython, for precomputed traces
  that load instantly) and in the learner's browser (Pyodide in a Web
  Worker, for custom inputs). A test keeps the two identical.
- Learners' own inputs run in a Web Worker on their device, with a step
  limit and a timeout. Only data reaches Python, never code, and it's
  parsed strictly and checked against per-problem limits.
- **Built-in problems** (hand-written, or drafted with AI and reviewed by a
  named person) are a static site.
- **Explain** handles problems that aren't built in. Pillow's API server
  makes two separate calls to Claude: one identifies the problem and writes
  examples with answers, and one drafts the lesson. The draft must pass five
  deterministic checks in a sandbox before anyone sees it:
  - the examples' answers;
  - agreement between the two solutions on random inputs;
  - narration on every step;
  - line coverage;
  - measured complexity.

  Failures go back to the model for repair. The result is cached for
  everyone and labelled as checked automatically, not reviewed by a person.
  See [docs/authoring.md](docs/authoring.md) and
  [ADR 0008](docs/adr/0008-pillow-films.md).

The full reasoning is in [docs/ASSESSMENT.md](docs/ASSESSMENT.md) and
[docs/adr/](docs/adr/).

## Status

**M0–M7 are done.** All six MVP problems are complete lessons: understand
the problem, a first approach, the better approach and why it works, a note
for every line, and time and memory measured from real runs. Every
approach can also run on your own input, or a one-click edge case, traced
live by real Python in your browser. Each push to `main` is tested
(unit and end-to-end) and deployed to GitHub Pages. New problems can be
drafted with Claude behind the validation pipeline, and published only
after review.

| Milestone | Status |
|---|---|
| M0 Tracer: real execution, stable object ids, step limits, CPython ↔ Pyodide parity | **Done** |
| M1 Interpreter: moments and changes, visualization specs, narration from real values, playback, validation | **Done** |
| M2 Workspace: views for arrays, pointers, windows, maps, stacks, linked lists, trees and the call stack; synced code pane; playback controls; keyboard; light and dark | **Done** |
| M3 Teaching layer: four-chapter lessons, line notes, measured complexity, lesson validation (Two Sum, Reverse Linked List) | **Done** |
| M4 Full lessons for Valid Parentheses, Binary Search, Longest Substring and Maximum Depth, each with a first approach; measured memory charts | **Done** |
| M5 Live custom input (Pyodide in a worker), input validation, end-to-end tests, GitHub Pages deploy | **Done** |
| M6 AI drafting pipeline: briefs, a sandbox for untrusted Python, five deterministic checks, a repair loop, review and promotion | **Done** |
| M7 Pillow: search-first home with a shelf; Explain for problems not built in (identify → draft → check → run → cache, streamed live) | **Done** |
| M7.1 The playground: edit the input by touch, race both solutions live, drag time and size; text cut to labels ([ADR 0009](docs/adr/0009-playground.md)) | **Done** |
| M8 Host the API server and grow the library (needs an Anthropic API key and a host) | Next |

**MVP problems:** Two Sum, Valid Parentheses, Binary Search, Longest
Substring Without Repeating Characters, Reverse Linked List, and Maximum
Depth of Binary Tree.

## Run it

Needs Node 22+ and Python 3.14 (it must match the Python inside Pyodide,
so build-time and browser traces stay identical).

```bash
npm install
```

```bash
npm test
```

```bash
npm run dev
```

End-to-end tests (production build, served at `/pillow/` as on Pages; uses
your installed Google Chrome):

```bash
npm run e2e
```

Run the API server, which explains problems that aren't built in. It needs
`ANTHROPIC_API_KEY` and Node 25+, and Vite proxies `/api` to it in development:

```bash
npm run server
```

Draft a new lesson for the built-in library (needs an Anthropic API key and Node 25+; see
[docs/authoring.md](docs/authoring.md)):

```bash
npm run draft -- contains-duplicate
```

Trace any solution from the command line:

```bash
npm run -s trace < request.json
```

`request.json` looks like this:

```json
{ "source": "def f(n):\n    return n * 2\n", "entry": "f", "args": [{ "kind": "value", "value": 21 }] }
```

## Layout

| Path | What's there |
|---|---|
| `engine/tracer/` | `tracer.py` (the tracer), `types.ts` (the trace format), `pyodide.ts` (running it in the browser), tests, and reference-solution fixtures |
| `engine/interpreter/` | Moments and changes, the visualization spec, the expression and narration language, view models, playback, validation, and specs for the six MVP problems |
| `src/content/` | The problem library, the lesson format, lessons, and lesson measurement and validation |
| `src/lesson/` | Chapter pages: Understand, approach intro and wrap-up, Compare, checks, the growth chart |
| `engine/analysis/` | Measuring how steps and memory grow, and classifying the growth |
| `src/views/` | Generic renderers, one per kind of view |
| `src/home/` | Home: one search field (suggestions, Explain) and the shelf |
| `src/play/` | The playground: the touchable input editor, live traces, racing lanes, the size slider |
| `src/explain/`, `src/lib/remote.ts` | Explaining a problem that isn't built in, streamed from the API server |
| `server/` | The API server: identify → draft → check → run → cache (`npm run server`) |
| `src/workspace/` | The full lesson: stage, narration, controls, code pane, the input bar |
| `src/lib/live.ts`, `src/lib/python.worker.ts` | Live tracing: the lazily started Pyodide worker, timeouts and restarts |
| `src/content/inputs.ts` | Custom-input fields, strict parsing, limits and labels |
| `e2e/` | Playwright end-to-end tests |
| `pipeline/` | AI drafting: schemas, prompts, the drafting loop, and the five checks |
| `engine/sandbox/` | Runs untrusted Python (AI drafts) isolated: Node permissions, an empty environment, Pyodide, timeouts |
| `content/briefs/` | Human-written briefs for new problems |
| `src/content/library/` | Promoted lessons (drafted with AI, reviewed), loaded alongside the hand-written ones |
| `.github/workflows/deploy.yml` | Test, then deploy to GitHub Pages |
| `src/home/` | Home: search, recently explored, problems by pattern |
| `scripts/build-traces.ts` | Precomputes and validates the trace for every example (runs before `dev` and `build`) |
| `docs/` | The product and technical assessment, plus architecture decision records |
| `scripts/copy-pyodide.mjs` | Copies the Pyodide runtime into `public/` |

## History

The product was called LeetSee from M0 to M6, and Pillow from M7 on. Before
LeetSee, this repository held an earlier product also named Pillow (an interview-readiness app) and
before that Nue. Both are preserved at the tags `archive/pillow-v1` and
`archive/nue-v1`. The repository keeps the name `pillow`.
