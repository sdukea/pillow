# ADR 0014: Clarity first — say what it teaches, explain every step, keep a reference

**Status:** accepted, 2026-11-20

## Context

Watching the product as a student exposed three things:

- **Problems opened cold.** You landed on data with no idea what you were
  about to learn.
- **Runs hid the reasoning.** Markers like `i` and `j` jumped with no
  explanation of what they *are*. A fast-forward skipped the middle of the
  run. The step's explanation was small and grey ("Try pairing it with
  index 4"), while a bigger sentence underneath repeated the headline.
- **The map wasn't a reference.** It recorded states, but you couldn't come
  back to it to learn anything.

## Decisions

1. **Every problem opens with an overview.** It shows the problem's full
   statement and its input, drawn, then **what this problem teaches**:
   every concept, from both approaches, in one line each, with your state
   on it ("New", "Learning", "Needs work", "Understood"). It also lists what
   those concepts build on. Every concept opens its reference card.
2. **Runs explain themselves.**
   - **Headings:** "The slow way" or "The fast way", with the approach's
     name as the title.
   - **Legends:** a legend explains every marker on screen (`i`: the first
     number of the pair; `j`: the second, always to the right of `i`). Each
     approach's legend is written by hand, and the build requires one.
   - **Full visualisation:** the variables come back, so the sum being
     tested is on screen, scaled up 1.3×.
   - **One explanation:** each step's explanation is the single large
     sentence on the page. There are no duplicate lines.
   - **Narration:** the thin lines, which fire on every loop, were
     rewritten to say what's being compared: "Partner: 8, at index 3. Do 11
     and 8 add up to 9?". They're validated on every step, as always.
3. **No fast-forward, and stepping is in your hands.** Runs play one step
   every 1.8 seconds, long enough to read. Large Back, Play/Pause and
   Forward buttons and a step counter let you go at your own pace. The
   prediction still stops the run, and you can't step past it without
   answering. The tests play runs 40× faster through the storage setting.
4. **The map is a reference you can rely on.**
   - **The list view is the default.** Every concept, grouped as Needs work,
     Review, Learning, Understood, Seen and Not met yet. The graph stays as
     the second view.
   - **Each concept's reference card** has:
     - what it is;
     - **Key facts**: how it works and what it costs, written for all 26
       concepts;
     - **Use it when**;
     - **Common mistakes**, flagging the ones you made;
     - **Practise with**: the problems that teach it;
     - **Builds on**;
     - **Your evidence**.
   - **Linkable:** `/map?c=<concept>` opens a card, so lessons can link
     straight to a concept.

## Consequences

- Runs take longer to watch (a 41-step brute force is about 70 seconds).
  Stepping makes that the student's choice, and the time goes on
  understanding rather than watching a blur.
- The concept facts are now teaching content, so they need the same care as
  the lessons. AI drafts must write legends; concept facts stay curated.
