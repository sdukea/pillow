# ADR 0010: One idea, then a note

**Status:** accepted, 2026-11-18

## Context

The playground (ADR 0009) put everything on one screen at once: an
editable input, two lanes, several structures per lane, counters,
captions, a scrubber and a size panel. Each part was useful; together
they were too much to start understanding anything.

How people actually get better at these problems:

- **One problem, one idea.** Each problem is worth learning for a single
  insight that transfers: "remember what you've seen", "halve what's
  left", "the last one opened closes first".
- **Contrast is what makes the idea land.** The fast way only looks
  clever next to the slow way, on the same small input.
- **Small steps.** One picture and one sentence at a time, at your own
  pace.
- **Recall, not rereading.** Trying to remember the trick later is what
  keeps it.

## Decisions

1. **A problem opens as five steps you move through yourself:** the
   problem drawn, the slow way playing, the trick in one sentence, the
   fast way playing on the same input, and your note. Each step is one
   picture or one sentence plus one button. Runs play by themselves in a
   few seconds (the repetitive middle fast-forwards); tap to pause or
   replay. The fast way ends on one line that makes the difference
   concrete, both here and at scale: "26 steps → 13 here. At 128 items:
   16,510 → 513."
2. **Every lesson has a card:** four short lines written by hand. They
   are the slow way, what it wastes, the trick, and how to spot the
   pattern next time. The build enforces length limits (60, 70, 90 and 70
   characters), and AI drafts must write one too. The card is the whole
   content of the learn screen's text.
3. **Notes replace the shelf.** Reaching the last step saves a note: the
   trick, how to spot it, and the pattern name. On Home, a note shows
   only the problem until you tap "What's the trick?", so you try to
   recall before you see it. Recalls are counted, for spaced review later.
4. **Depth stays, out of the way.** The note step offers "Play with it"
   (the playground: edit the input, race both) and "Full lesson" (the
   chapter-by-chapter explanation with notes on every line).
   Runs on the learn screen draw only the data structures, not the lists
   of variables. One short live caption under the picture carries the
   numbers.

## Consequences

- The cards carry the teaching, so their quality matters more than
  anything else on the page. They're short enough to review at a glance.
- Recall counts are stored but not yet used to schedule reviews. Spaced
  review ("3 notes to recall today") is the natural next step.
