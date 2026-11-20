# ADR 0012: Reasoning — derive the trick, and name the misconception

**Status:** accepted, 2026-11-20

## Context

After M8, students predicted what code does, but they were still *told*
the key idea. Predicting tests reading an algorithm, not deriving it.
And when a student got something wrong, Pillow could say "shaky" but not
*what* they misunderstood, so it couldn't help them fix it.

## Decisions

1. **A "Your turn" step between the slow way and the trick.** Two
   Socratic questions per problem take the student from what the slow
   way repeats or ignores to what to remember or use instead. The trick
   step that follows then confirms what they worked out. Each question is
   hand-written, with three choices: one right and two plausible wrong
   ones.
2. **Wrong answers diagnose.** A curated catalog of 18 misconceptions
   (`src/knowledge/misconceptions.ts`), each tied to a concept, such as
   "thinks checking a hash map means scanning every key" or "thinks the
   oldest open bracket closes first". Each wrong choice names the
   misconception it reveals, and its reply addresses exactly that. Every
   choice, right or wrong, has a reply explaining why.
3. **Evidence rules:**
   - **First answer only.** The first answer to each question is recorded
     (`task: "reason"`); later tries aren't. A wrong first answer records
     its misconception, and also counts against the misconception's own
     concept.
   - **Try until right.** After a wrong answer, the student tries again
     until they reach the right one, so everyone gets to the idea. Moving
     on stays locked until then.
   - **Hints weaken the evidence.** Two hints per question; a hinted right
     answer is recorded as `hinted`, which the model doesn't count towards
     "understood".
4. **Misconceptions in the model, the map and the recommendations.**
   - **The model:** a concept's standing misconceptions are those shown
     since its last clean right answer. A shaky concept explains itself in
     the student's terms: "You seemed to think looking something up in a
     hash map means scanning every key."
   - **The map** shows them on the concept.
   - **"Fix" recommendations** put named misconceptions first, ahead of
     plain misses, because they're the most specific thing to fix.
5. **Position never gives the answer away.** Lessons are written with the
   right answer first. The learn screen shows each step's choices in an
   order fixed per problem and step, and a test checks the right answer
   lands first, in the middle and last across the lessons.
6. **AI drafts write reasoning too,** under the same rules: the schema,
   the prompt and validation. Validation requires 2–3 steps per lesson
   and, for each step, exactly one right choice, at least three choices, a
   reply for every choice, one or two hints, and known concepts and
   misconceptions only.

## Consequences

- Two questions per problem is deliberately few. Enough to make the
  student think, not so many that the step becomes a quiz.
- The misconception catalog is small and hand-curated. It should grow
  from real wrong answers, once there are students to learn from.
