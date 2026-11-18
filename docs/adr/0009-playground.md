# ADR 0009: Hands on, not read

**Status:** accepted, 2026-11-18

## Context

The film (ADR 0008) still asked people to read: full-sentence headlines,
paragraphs, captions. Learners arriving frustrated need to see it and move
it, not be told. Understanding forms when you change something and watch
the consequence.

## Decisions

1. **A problem opens as a playground**, not a film. The visualization is
   the interface:
   - **The input is objects.** Cells you drag up and down to change and
     sideways to reorder; drop one in the bin to delete it; tap + to add.
     Numbers you drag sideways. Trees grow where you tap an empty slot and
     shrink when you tap a node. Every gesture has a keyboard equivalent.
     Rules hold while you play: a sorted list stays sorted with no repeats,
     and a bracket string only takes brackets.
   - **Every change re-runs real code.** Both approaches are traced again
     by Python in the browser's worker, a quarter of a second after your
     hands stop. The example uses the build's traces, so it's instant.
   - **The two approaches race side by side** on the same input, on one
     clock. Each lane shows its step count growing; the one that finishes
     first gets a green outline while the other keeps going. You drag time
     yourself with the scrubber, or press play.
   - **Grow it.** A size slider shows the real measured counts at each
     size, and the ratio between them (×32 for Two Sum at 128). It sweeps
     once by itself, then it's yours. When both approaches take the same
     time, it shows memory instead.
2. **Text is cut to labels.** The title, a one-line summary, approach
   names, counters, and one short line per lane (the step's narration).
   The explanations still exist, in the full lesson one tap away (Lesson).
3. **The film is removed.** Two front doors were one too many, and the
   playground subsumes the film's visual parts.
4. **Finishing a race saves the problem to the shelf;** so does the Save
   button.

## Consequences

- The first change to an input loads Python (a few seconds, once per
  visit). The previous traces stay on screen, dimmed, until the new ones
  are ready.
- On a phone the lanes stack, so you scroll to compare. A compact
  side-by-side mode for narrow screens would be a good next step.
