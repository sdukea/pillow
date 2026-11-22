# ADR 0018: Views for the whole syllabus, and lessons that say why they're right

**Status:** accepted, 2026-11-23

## Context

The curriculum's weeks 8–15 need data structures Pillow couldn't draw:
DP tables, heaps, graphs and union-find. Lessons explained how an
approach works and what it costs, but not *why it's correct*, and not
what an interviewer asks next. And every trace was bundled into the first
page load, which wouldn't survive 200 lessons.

## Decisions

1. **Four new views, held to the same contract as the existing ones:** a
   spec names real variables, a view model is derived from the trace,
   and a dumb renderer draws it. Each is validated on every moment.
   - **grid:** a list of lists, with row and column pointers.
     `focus.cells` outlines the cells a line reads, because seeing which
     earlier cells a DP cell comes from is the whole idea.
   - **heap:** a `heapq` list drawn as the tree it represents.
     "Removed" is the difference between before and after, counting
     repeats.
   - **graph:** an adjacency dict or list. Nodes sit on a circle, placed
     once from every node the run ever creates, so nothing moves.
     Visited, current and frontier are expressions; `(v, w)` pairs become
     weights.
   - **union-find:** the parent list or dict as a forest, laid out each
     moment. Changed parents are highlighted; a cycle seen mid-update is
     drawn safely rather than looping.
2. **Every lesson says why it's right.**
   - **Correctness:** `correctness` (invariant, whyCorrect, ends) is
     required on the optimal approach.
   - **Follow-ups:** one to three `followUps` are required.
   - **Enforced everywhere:** the validator, the AI pipeline's shape
     check and the schema all enforce this, and the drafting prompt asks
     for it.
3. **Kept lean in the learn flow.**
   - **Why it's right:** one line, the invariant, after the fast run.
   - **Follow-ups:** answers hidden until tapped, so they're recall, not
     reading.
   - **Practise next:** three related problems.
   - **The full lesson** shows everything.
4. **Related problems are derived, not written.** They share the main
   technique first, then concepts; built lessons and core problems come
   first. The curriculum loads lazily for this.
5. **Traces load per problem.** Each problem's screens wait for its
   chunks (`loadProblemData`).
6. **A development-only lab** (`/lab`) plays each new view on a reference
   fixture. It's compiled out of production, and its traces are excluded
   from the published build.

## Consequences

- The lab fixtures (Unique Paths, Kth Largest, Course Schedule, Redundant
  Connection) are tested and validated, but they aren't lessons yet. They
  are natural first candidates for weeks 9–14.
- The graph's circle layout is clear up to about 10 nodes. Larger graphs
  will need a force or layered layout.
