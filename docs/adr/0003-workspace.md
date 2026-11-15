# ADR 0003: The workspace, renderers and precomputed traces

**Status:** accepted, 2026-11-15

## Decisions

1. **Traces for every example are precomputed at build time** by
   `scripts/build-traces.ts`, which also validates each spec against its
   trace and fails the build on any problem. Traces ship as JSON. The whole
   app is about 87 KB compressed, and no Python runtime is downloaded until
   custom input (M5).
2. **A purpose-built code pane instead of CodeMirror.** The pane is
   read-only. Its job is precise "just ran" and "runs next" markers plus
   live variables, and a small tokenizer does that with full control and
   about 540 KB less JavaScript. This reverses the assessment's choice.
3. **Renderers are generic HTML and CSS, with SVG only for arrows and
   edges.** Every renderer reads a view model and nothing else. Positions
   come from stable data (array indexes, linked-list order by heap id, a
   tree layout fixed per trace), so CSS transitions animate meaningful
   motion (a pointer moving, an arrow flipping) and nothing jumps.
4. **Colour means state, never decoration.** Blue is attention (pointers,
   the line that ran, the focused key, the active call). Green is added,
   amber is changed, and red is removed.
5. **The narration sits directly under the visualization**, with the
   playback controls at the bottom of the stage and the code pane beside it.
   On narrow screens everything stacks into one column, and the code pane
   scrolls itself (never the page) to keep the active line visible.
6. **Keyboard first:** ←/→ to step, Space to play or pause, R or Home to
   restart, End to jump to the end, and Shift+→ / Shift+↑ to step over or
   out in recursive code. Every action also has a visible control with its
   shortcut in the label.
7. **Light and dark themes are both designed.** The app follows the system
   unless the learner picks one, and the choice is remembered.

## Content decision

Two Sum uses `[11, 15, 3, 8, 2, 7]` with target 9 instead of LeetCode's
`[2, 7, 11, 15]`. On LeetCode's example, brute force finds the pair on its
first comparison, which hides exactly the cost the lesson is about. A test
guards this: brute force must take visibly more steps than the hash map on
the example.
