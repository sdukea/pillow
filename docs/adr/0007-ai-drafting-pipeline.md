# ADR 0007: AI drafts lessons; deterministic checks and a person decide

**Status:** accepted, 2026-11-17

## Context

Six hand-written lessons took most of M3 and M4. The library needs to grow
far faster than that, and the brief allows AI only behind a validation
pipeline. LLMs are good at drafting prose, code and specs, and they are
unreliable at exactly the things LeetSee promises: correct solutions,
honest complexity claims, and narration that matches what really happens.
So the model may draft, but it never decides what's true.

## Decisions

1. **A person writes the brief; the model writes the draft.** A brief
   (`content/briefs/<slug>.json`) gives the problem, the entry function,
   the input fields and rules, and examples with expected outputs. Those
   expected outputs are the ground truth. It may also give LeetCode's
   input guarantee as a Python `precondition`, e.g. "exactly one pair adds
   up to target". The model (Claude Opus 5.5, adaptive thinking, effort
   `high`) returns a draft as structured output: two solutions, two
   visualization specs, and every piece of lesson text.
2. **Five deterministic checks** (`pipeline/validate.ts`), all required:
   - **shape:** two approaches; the example and edge cases are valid
     inputs; the growth generator works.
   - **examples:** both solutions match the brief's expected outputs.
   - **agreement:** both solutions return identical results on 24 random
     valid inputs and every edge case. This is differential testing; it
     caught a real ambiguity in Two Sum on its first run.
   - **visualization:** every spec expression and every narration
     evaluates on every step, on the example and on random inputs.
   - **lesson:** every line that runs is explained and narrated, and each
     complexity claim matches measured growth.

   These are the build's own checks, reused, so a draft is held to exactly
   the standard of hand-written lessons. The tests prove the validator
   accepts all six hand-written lessons (converted to drafts) and rejects
   each kind of broken draft.
3. **Failures go back to the model**, up to three attempts, in an
   append-only conversation: the full previous reply, then the failures.
   The system prompt (standard, formats, rules, and a worked example that
   passes every check) is identical across attempts and problems, and
   cached.
4. **Untrusted code runs only in a sandbox** (`engine/sandbox/`). That
   covers the solutions, the growth generator, and even the brief's
   precondition. The sandbox has four layers:
   - **Node's permission model:** a separate Node process may only read
     the Pyodide and tracer files. File writes, child processes, workers,
     native addons and network are all denied; network needs Node 25 or
     later, which the sandbox requires.
   - **An empty environment,** so API keys are invisible.
   - **Pyodide (WebAssembly)** with an in-memory file system, and the
     modules that bridge to JavaScript blocked.
   - **A timeout per request,** with a fresh process afterwards. A fatal
     interpreter error also replaces the process.

   The tests attempt each escape and confirm it fails.
5. **A person publishes.** `npm run draft` writes only to
   `content/drafts/` (git-ignored). `npm run promote -- <slug> --reviewer
   "Name"` re-runs every check, since the reviewer may have edited the
   draft, then refuses without a named reviewer. It writes the solutions
   as fixtures and the lesson as `src/content/library/<slug>.json`. From
   then on the ordinary build validates it with CPython, like any
   hand-written lesson.
6. **Learners can see it.** A promoted lesson says it was drafted with
   AI, which model drafted it, and who reviewed it, and when.

## Consequences

- The cost of a lesson moves from writing it to reviewing it. The checks
  catch what can be checked mechanically: correctness on the brief's
  examples and on random inputs, line coverage, narration that evaluates,
  and honest complexity. A reviewer still owns what can't be: whether the
  explanations teach well, whether the first approach is the one a
  beginner would really try, and whether the prose is accurate.
- Agreement between two AI-written solutions isn't proof of correctness.
  That's why the brief's human-written examples are required, and why a
  person signs off.
- No draft has been run against the live API in this repository yet,
  because no credentials are configured. Everything up to the API call is
  tested with a scripted model, and `content/briefs/contains-duplicate.json`
  is ready for the first real run.
