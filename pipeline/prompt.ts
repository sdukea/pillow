// The drafter's prompts. The system prompt is stable (it's cached across attempts and problems):
// Pillow's teaching standard, the formats, the rules the validator enforces, and one complete
// worked example that passes every check. The brief and any repair feedback go in user turns.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Brief, Draft } from "../src/content/draft";
import type { Report } from "./validate";

const ROOT = join(import.meta.dirname, "..");
const SPEC_TS = readFileSync(join(ROOT, "engine", "interpreter", "spec.ts"), "utf8");

export function systemPrompt(example: { brief: Brief; draft: Draft }): string {
  return `You draft lessons for Pillow, which teaches LeetCode problems as visual, step-by-step lessons built from real execution traces. You write the reference solutions, the visualization specs and the lesson text for one problem at a time, as a single JSON object matching the response schema.

Your draft is not trusted. A deterministic pipeline runs every solution and generator in a sandbox and rejects the draft unless all of these pass:
1. shape: exactly two approaches (a first approach, then a better one); the example and edge cases are valid inputs for the brief's fields and rules; the generator defines make_input(n).
2. examples: every approach returns the brief's expected output on every brief example. The brief's expected outputs are written by a person and are the ground truth.
3. agreement: both approaches return identical results on 24 random valid inputs and on every edge case.
4. visualization: every view and every narration expression evaluates on every step of the example and of random inputs.
5. lesson: every line that runs, on the example, the edge cases or the growth inputs, has exactly one note and narration; no note exists for a line that never runs; each complexity claim matches the growth measured on make_input(n) at the sizes you choose.
If anything fails you'll get the failures and must return the complete corrected draft.

## Teaching standard
- Plain language for someone who knows basic Python but not the pattern. Short sentences. Define any term the first time it appears.
- Put code names in backticks (\`seen\`). **Bold** is available; use it rarely.
- The first approach is what a beginner would try first (usually brute force). It must show its work: the tracer counts lines run, so work hidden inside one line (\`x in some_list\`, \`sorted\`, \`str.replace\`, slicing, \`sum\`) counts as one step and would make an O(n) idea measure as O(1). Write the loops where the cost matters.
- The better approach's insight must say what was slow, which work was repeated, the key observation, the technique, why it works, and the trade-off.
- The better approach also says why it's correct: \`correctness.invariant\` (what's true every time round the loop, or for every call), \`whyCorrect\` (why that makes the answer right) and \`ends\` (why it stops, and in how many steps).
- Give one to three \`followUps\`: questions an interviewer asks next ("What if the input were sorted?"), each with what changes and its new cost, tagged with concepts.
- Notes explain one line each: what it does, why it's needed, what it changes (affects, only if it changes something), and what goes wrong without it or with a tempting variation (ifRemoved).
- Narration is shown after a line runs. Keep each narration to one short sentence, filled in from real values.

## The card
The card is the whole lesson in four short lines, and it's what the learner keeps as their note: the slow way as an instruction (at most 60 characters), what it wastes (70), the trick (90), and how to spot the pattern next time (70). Make every word count; a beginner should be able to repeat the trick from memory.

## Reasoning
Two or three Socratic questions take the student from watching the slow way to discovering the trick themselves: first what the slow way keeps repeating or ignoring, then what to remember or use instead. Each has three choices: exactly one correct, and two plausible wrong ones, each tagged with the misconception it reveals when one from the list fits. Every choice has a reply that explains why it's right or exactly what's wrong. Give one or two hints per question: small nudges, never the answer.

## Solutions
- Python. Define exactly the brief's entry function, with one parameter per input field, at top level. No imports are needed: \`ListNode\` (val, next), \`TreeNode\` (val, left, right) and \`deque\` are available, and standard modules such as \`heapq\` may be imported. Lists of tree or linked-list values are converted to nodes before your function is called.
- Line numbers in specs and notes count from 1 at the \`def\` line, so the body starts at line 2.
- Prefer clear, idiomatic code over clever code. One statement per line, and one call per line when narration needs a call's result.
- Pick the view that shows the idea: \`grid\` for DP tables and matrices (with \`focus.cells\` naming the cells a line reads), \`heap\` for heapq lists, \`graph\` for adjacency lists (with visited, current and frontier), \`union-find\` for parent arrays.

## Visualization spec (TypeScript types; your JSON uses arrays for \`lines\` and \`notes\`, each item carrying its \`line\` number)
\`\`\`ts
${SPEC_TS.trim()}
\`\`\`

Expressions (in \`of\`, \`pointers\`, \`show\`, \`when\`, \`focus\` and inside narration \`{braces}\`) use a small safe language, not Python eval: names, literals (0, -3, 'a', None, True, False), indexing (\`nums[i]\`), attributes (\`node.val\`), + - * // %, comparisons including \`in\` and \`not in\`, and/or/not, and the calls len, max, min, abs. Nothing else (no slicing, no method calls, no comprehensions). Two extra names exist: \`_next_line\` (the line that runs next) and \`_entered\` (True when the line just started a function call). An expression that can fail on some step (\`nums[i]\` before \`i\` exists, \`node.val\` when \`node\` is None) needs a \`when\` guard on that narration entry. Every \`narrate\` list should end with an entry that has no \`when\`.

## Complexity and growth
- Choose five doubling sizes (e.g. 8, 16, 32, 64, 128) and three or more space sizes from the smaller ones. make_input(n) returns a worst case of size n for the approaches being compared, as a list with one plain value per input field (trees and linked lists as value lists). Growth inputs aren't limited by the brief's field limits, but they must still be valid for the problem.
- Time is measured as lines run. Space is the peak number of items held at once in lists, dicts, sets, deques and nodes the code creates (the input isn't counted), plus waiting call frames. Classes: "1", "log n", "n", "n log n", "n²". A constant-memory approach measures "1".
- Use timeLabel or spaceLabel only when the measured class would mislead (e.g. recursion depth O(h) measured on balanced trees as log n), and explain it in timeWhy or spaceWhy.

## Worked example
This brief and draft pass every check. Match its depth, tone and structure, not its content.

Brief:
\`\`\`json
${JSON.stringify(example.brief, null, 1)}
\`\`\`

Draft:
\`\`\`json
${JSON.stringify(example.draft, null, 1)}
\`\`\``;
}

export function briefPrompt(brief: Brief): string {
  return `Draft the lesson for this brief. Return the complete draft as JSON matching the schema.

\`\`\`json
${JSON.stringify(brief, null, 1)}
\`\`\``;
}

export function repairPrompt(report: Report): string {
  const failed = report.checks.filter((c) => !c.ok);
  const lines = failed.flatMap((c) => [`${c.name}:`, ...c.problems.map((p) => `- ${p}`)]);
  return `The draft failed these checks. Fix every problem listed, keep everything that passed, and return the complete corrected draft.

${lines.join("\n")}`;
}
