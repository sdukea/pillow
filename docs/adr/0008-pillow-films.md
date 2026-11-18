# ADR 0008: Pillow — type a problem, watch a film

**Status:** accepted, 2026-11-18

## Context

LeetSee asked learners to pick a problem from a list and work through
four chapters. The product is now Pillow, built around one sentence:
*paste any LeetCode problem, watch how to solve it.* The first thing
someone sees after typing must be the most intuitive explanation
possible, with no choices to make first.

## Decisions

1. **Home is one search field and a shelf; there's no catalogue.**
   - The field takes a name, a number or a link.
   - As you type, problems that are already explained appear first. The
     last suggestion is always "Explain …".
   - Below the field is the shelf: every film you watch is saved there when
     it ends, or when you tap Save. You can remove items from it.
   - We rejected a browsable list. With thousands of possible problems, a
     list competes with the search field, and the field is the product.
     Suggestions still surface what's ready instantly. The shelf is kept in
     the browser: there are no accounts yet.
2. **Every lesson plays as a film** (`src/film/`) that starts on its own:
   1. the question, with the input drawn;
   2. the obvious idea, then its real trace;
   3. where it wastes time;
   4. the insight;
   5. the better idea, then its real trace;
   6. side by side;
   7. the pattern to remember.

   The film is built from the same lesson data and real traces as the full
   lesson, so nothing is invented for it. Long runs are paced: the first and
   last steps play at reading speed and the repetitive middle fast-forwards,
   but every step is still shown. A 400-step brute force and a 20-step
   optimal solution both fit. Controls float and are optional: play or
   pause, previous and next scene, code, and save. The scene bar seeks. The
   full chapter-by-chapter lesson stays one tap away (Full Lesson).
3. **The side-by-side race shows whatever actually differs.** When both
   approaches have the same time complexity (Maximum Depth), a race on
   steps would mislead, because recursion looks slower. The race switches
   to measured memory: 64 items held at once against 7.
4. **Explain covers problems that aren't built in** (`server/`):
   - **Identify:** a model call turns what was typed into a brief,
     including examples with answers.
   - **Draft:** a separate call writes the lesson. Two independent
     generations must agree.
   - **Check:** the five sandbox checks from ADR 0007, with repairs.
   - **Film:** both solutions are traced and growth is measured in the
     sandbox.
   - **Cache:** the result is saved on disk, so the next person gets it
     instantly, and identical questions skip identification.

   Each stage streams to the browser as it happens: the problem's statement
   appears after the first step, then the progress. Generated films are
   labelled as checked automatically but not reviewed by a person. The
   browser never sees the API key.
5. **The design follows Apple's current guidelines** (the apple-design
   skill):
   - **Colour:** system light and dark only, with no in-app theme switch, a
     true black base in dark mode, and `#1c1c1e` surfaces.
   - **Type and controls:** big type carries the hierarchy, controls float
     on glass, and each view has one tinted action.
   - **Touch and motion:** targets are at least 44 pt, and Reduce Motion is
     respected.
6. **Rendering videos was considered and rejected.** The plugins available
   here (Remotion, HyperFrames) render video files. But "right away" rules
   out rendering per request, and a rendered video can't pause on a step,
   show the code, or run your own input. The film is live UI, built from
   traces.

## Consequences

- A new problem isn't instant the first time. Identifying and drafting
  take about a minute or two, and the screen says so and shows each
  stage. After that it's instant for everyone.
- Explain needs a host for the API server and an Anthropic API key. On
  the static GitHub Pages site, Explain says plainly that it isn't
  available yet, and every built-in film works.
- Ground truth for live problems comes from a model, not a person. That's
  weaker than a human-written brief, which is why live films are labelled
  as unreviewed, and why promoting one into the built-in library still
  needs a named reviewer.
