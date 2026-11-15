# ADR 0001: Real execution traces plus declarative visualization specs

**Status:** accepted, 2026-11-14

## Context

LeetSee must visualize algorithms step by step, in sync with the code, for
hundreds of problems. The visuals must reflect actual execution, never a
fabricated sequence. The visualization engine must not be coupled to
individual problems, and code must never run on the application server.

## Decision

1. **Trace real execution with Python's `sys.settrace`.** Each step records
   the event (call, line, return), the line, every frame's local variables,
   a heap graph of containers and objects with **stable sequential ids**,
   and return values.
2. **Run the same tracer in two places:** CPython at build time
   (precomputed traces for default inputs, shipped as JSON) and Pyodide in
   a Web Worker on the learner's device (custom inputs). A parity test keeps
   them identical.
3. **Give meaning to the generic trace with a per-approach declarative
   visualization spec:** which variables are arrays, pointers, windows,
   maps or trees, plus line annotations (such as "comparison") and
   narration templates evaluated against real state. The spec can describe
   how to show state; it cannot create state.
4. **A pure TypeScript interpreter** diffs consecutive snapshots into
   semantic events, and generic renderers draw view models. Nothing in the
   renderers is problem-specific.

## Evidence

A spike traced Two Sum, Reverse Linked List and a recursive function. The
traces were identical in CPython and Pyodide (11/11, 21/21 and 16/16
steps) once object ids were made sequential. Pointer rewiring and
recursion depth appear correctly. Tracing all three took 11 ms in Pyodide.

## Alternatives rejected

- **Hand-written per-problem step generators:** they duplicate the
  algorithm and can drift from the code shown.
- **LLM-generated traces:** fabricated.
- **Regex or text parsing:** can't recover state.
- **AST instrumentation:** viable, but adds rewriting complexity for no
  fidelity gain over `settrace`.
- **A generic tracer alone:** faithful, but it can't express "window" or
  "pointer into nums".

## Consequences

- Execution is Python-only until another language gets its own tracer
  (each is a separate engine and a separate ADR).
- Each problem needs a small spec and authored notes. That's the
  content-cost driver, which the offline AI pipeline addresses.
- Trace size grows with steps × state. Inputs stay small (which suits
  teaching) and steps are capped; structural sharing can come later if
  needed.
