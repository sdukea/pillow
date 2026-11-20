# ADR 0013: Write it yourself — independent solving

**Status:** accepted, 2026-11-20

## Context

After M9, students derived the trick and predicted its execution, but
never produced a solution. "I understand it" and "I can do it" are
different, and only the second prepares anyone for an interview.

## Decisions

1. **A "Write it yourself" step after the fast way.** An editor starts
   from the function signature. It's a plain text area, with no new
   dependency: Tab indents, Enter keeps the indentation (and adds a level
   after a colon), and Cmd or Ctrl+Enter runs. The draft is kept per
   problem. The step is optional ("Skip for Now"), because writing code
   takes longer than the rest of the lesson. It's the strongest evidence
   Pillow has.
2. **Checked against the reference, not hand-written answers**
   (`src/solve/check.ts`):
   - **Cases:** the example, every edge case, and 8 random valid inputs.
     They're seeded per problem, and filtered by the problem's
     precondition, run as Python.
   - **Expected outputs:** the reference solution's results, normalised
     the same way as in the AI pipeline. Problems whose answer order
     doesn't matter (Two Sum's indices) are compared order-free.
   - **Where it runs:** in the browser's Pyodide worker, with a 200,000-line
     limit, so an endless loop is reported as "Too slow". The checker
     takes its runner as a parameter, so unit tests check it with CPython.
3. **Errors a beginner can act on.** The tracer now returns syntax errors,
   runtime errors and a missing or misnamed function as results, with the
   line ("Line 2: SyntaxError invalid syntax"), instead of crashing. A
   failing case shows its input, what was expected and what came back. It
   opens in a **step-through debugger**: the student's own code, one line
   at a time, with their variables.
4. **Correct isn't the bar; the trick is.** Once every case passes, the
   solution runs on the lesson's growth inputs and its growth is
   classified. A brute force that passes is told: "All 12 cases pass but
   it grows like O(n²). The trick makes it O(n)."
5. **Evidence** (`task: "implement"`), recorded on the first all-pass run:
   - `correct` only when the solution is as fast as the trick;
   - `hinted` if the student opened "Show a solution", and the result
     says so ("this counts as practice").

   Failed runs aren't recorded, so trying costs nothing.

## Consequences

- Python only, for now. The checker and debugger are language-neutral
  apart from the runtime, but supporting Java or C++ needs a different
  way to run code and to trace it. That waits on knowing what students
  use.
- Random inputs are bounded by each problem's input limits, so they're
  small. Growth is what catches inefficient solutions, not the size of
  the test inputs.
