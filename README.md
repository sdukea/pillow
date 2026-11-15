# LeetSee

*Don’t just see the answer. See how it thinks.*

LeetSee turns LeetCode problems into visual, step-by-step lessons. You start
with the brute-force approach and see why it's slow. Then you discover the
better approach, watch it run line by line, and see every variable,
pointer and data structure change. You leave with the pattern, not just
the answer.

LeetSee complements LeetCode: LeetCode gives you problems to solve, and
LeetSee shows how they're solved.

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
- Code never runs on our servers. Live traces run in a sandboxed worker on
  the learner's device, with a step limit and a timeout.
- AI helps draft lessons offline. Every draft is checked by tests,
  differential testing and measured complexity, then reviewed by a person,
  before a learner sees it.

The full reasoning is in [docs/ASSESSMENT.md](docs/ASSESSMENT.md) and
[docs/adr/](docs/adr/).

## Status

**M0–M2 are done: all six MVP problems can be watched step by step in the
browser.** Next is M3, the teaching layer (plain-language problem chapters,
brute force first, line-by-line explanations, the comparison).

| Milestone | Status |
|---|---|
| M0 Tracer: real execution, stable object ids, step limits, CPython ↔ Pyodide parity | **Done** |
| M1 Interpreter: moments and changes, visualization specs, narration from real values, playback, validation | **Done** |
| M2 Workspace: views for arrays, pointers, windows, maps, stacks, linked lists, trees and the call stack; synced code pane; playback controls; keyboard; light and dark | **Done** |
| M3 Teaching layer: Two Sum and Reverse Linked List to full quality | |
| M4 The other four MVP problems | |
| M5 Live custom input, polish, deploy | |
| M6 AI-assisted content pipeline | |

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
| `src/content/` | The problem library: examples, approaches and their specs |
| `src/views/` | Generic renderers, one per kind of view |
| `src/workspace/` | The workspace: stage, narration, controls, code pane |
| `src/home/` | Home: search, recently explored, problems by pattern |
| `scripts/build-traces.ts` | Precomputes and validates the trace for every example (runs before `dev` and `build`) |
| `docs/` | The product and technical assessment, plus architecture decision records |
| `scripts/copy-pyodide.mjs` | Copies the Pyodide runtime into `public/` |

## History

This repository was previously Pillow (an interview-readiness app) and
before that Nue. Both are preserved at the tags `archive/pillow-v1` and
`archive/nue-v1`. The repository keeps the name `pillow`.
