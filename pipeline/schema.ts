// Zod schemas for briefs and drafts. The draft schema is sent to the model as a structured-output
// format, so the response is always parseable; everything about whether it's *right* is checked
// afterwards by pipeline/validate.ts. Compile-time checks below keep these schemas and the app's
// types (src/content/draft.ts) in step.

import { z } from "zod";
import type { Brief, Draft } from "../src/content/draft";
import { PATTERNS } from "../src/content/problems";
import { CONCEPTS, type ConceptId } from "../src/knowledge/concepts";
import { MISCONCEPTIONS, type MisconceptionId } from "../src/knowledge/misconceptions";

const text = z.string();
const GROWTH = ["1", "log n", "n", "n log n", "n²"] as const;
const TAGS = ["init", "loop", "compare", "lookup", "update", "move", "branch", "call", "return"] as const;

const Check = z.object({
  question: text,
  options: z.array(text).describe("Two to four options."),
  answer: z.number().int().describe("Index of the correct option."),
  explain: text.describe("Why the answer is right, shown after any choice."),
});

const View = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("array"), id: text, of: text.describe("Expression for the list or string, e.g. \"nums\"."), label: text.optional(),
    pointers: z.array(text).optional().describe("Integer variables drawn under cells, e.g. [\"i\", \"j\"]."),
    range: z.object({ from: text, to: text, label: text.optional() }).optional().describe("Inclusive band, e.g. a window from left to right."),
  }),
  z.object({ kind: z.literal("map"), id: text, of: text, label: text.optional() }),
  z.object({ kind: z.literal("set"), id: text, of: text, label: text.optional() }),
  z.object({ kind: z.literal("stack"), id: text, of: text, label: text.optional() }),
  z.object({ kind: z.literal("queue"), id: text, of: text, label: text.optional() }),
  z.object({ kind: z.literal("vars"), id: text, show: z.array(text).describe("Scalar expressions to watch."), label: text.optional() }),
  z.object({ kind: z.literal("linked-list"), id: text, pointers: z.array(text), label: text.optional() }),
  z.object({
    kind: z.literal("tree"), id: text, root: text, current: text, label: text.optional(),
    waiting: text.optional().describe("A list or queue of nodes waiting to be handled, e.g. \"queue\"."),
    showReturns: z.boolean().optional().describe("Show each call's return value on its node. Default true; false for non-recursive code."),
  }),
  z.object({ kind: z.literal("call-stack"), id: text, show: z.array(text), label: text.optional() }),
]);

const Approach = z.object({
  id: text.describe("kebab-case, e.g. \"brute-force\"."),
  name: text.describe("Short switcher label, e.g. \"Brute force\"."),
  concepts: z.array(z.enum(CONCEPTS.map((c) => c.id) as [ConceptId, ...ConceptId[]])).describe("The concepts this approach exercises."),
  legend: z.array(z.object({ name: text, means: text })).describe("What each pointer, variable and structure on screen means, in a few words: i → \"the first number of the pair\"."),
  solution: text.describe("Python source defining the brief's entry function. Nothing else at top level."),
  spec: z.object({
    views: z.array(View),
    lines: z.array(z.object({
      line: z.number().int(),
      tag: z.enum(TAGS).optional(),
      narrate: z.array(z.object({ when: text.optional(), text })).describe("First entry whose `when` holds is shown. End with one that has no `when`."),
      focus: z.object({ view: text, key: text.optional(), index: text.optional() }).optional(),
    })),
  }),
  headline: text,
  intuition: text,
  discovery: text,
  steps: z.array(text),
  insight: z.object({ inefficiency: text, repeatedWork: text, observation: text, technique: text, whyItWorks: text, tradeoffs: text }).optional()
    .describe("Required for every approach after the first; omit for the first."),
  notes: z.array(z.object({ line: z.number().int(), what: text, why: text, affects: text.optional(), ifRemoved: text })),
  complexity: z.object({
    time: z.enum(GROWTH), space: z.enum(GROWTH), timeLabel: text.optional(), spaceLabel: text.optional(),
    counted: text, timeWhy: text, spaceWhy: text,
  }),
  whyNotEnough: text.optional().describe("Required for the first approach; omit for the last."),
  check: Check.optional(),
});

const Reasoning = z.array(z.object({
  ask: text.describe("A short Socratic question that moves the student one step from the slow way towards the trick."),
  concepts: z.array(z.enum(CONCEPTS.map((c) => c.id) as [ConceptId, ...ConceptId[]])),
  choices: z.array(z.object({
    text: text,
    correct: z.boolean().optional().describe("Exactly one choice per step is correct."),
    misconception: z.enum(MISCONCEPTIONS.map((m) => m.id) as [MisconceptionId, ...MisconceptionId[]]).optional().describe("For a wrong choice: the misconception it reveals, if one fits."),
    reply: text.describe("Shown after picking it: why it's right, or exactly what's wrong with it."),
  })).describe("Three choices: one correct, two plausible wrong ones."),
  hints: z.array(text).describe("One or two hints, each a small nudge, never the answer itself."),
})).describe("Two or three steps that lead from the slow way to the trick.");

export const DraftSchema = z.object({
  summary: text,
  reasoning: Reasoning,
  card: z.object({
    slow: text.describe("The slow way as an instruction, at most 60 characters: \"Try every pair of numbers.\""),
    waste: text.describe("What the slow way wastes, at most 70 characters."),
    trick: text.describe("The trick, at most 90 characters, in plain words a beginner remembers."),
    recognize: text.describe("How to spot the pattern next time, at most 70 characters: \"Looking for a pair that adds up? Store what you've seen.\""),
  }),
  example: z.object({ values: text.describe("JSON array, one value per input field."), label: text.describe("How it reads, e.g. nums = [2, 7], target = 9.") }),
  understand: z.object({
    statement: text,
    inputs: z.array(z.object({ name: text, meaning: text })),
    output: text,
    walkthrough: z.array(text),
    constraints: z.array(text),
    testing: text,
    check: Check.optional(),
  }),
  approaches: z.array(Approach).describe("Exactly two: a first approach, then the better one."),
  compare: z.object({
    tradeoffs: text,
    takeaways: z.array(text),
    pattern: z.object({ name: text, recognize: text, alsoUsedIn: z.array(text) }),
  }),
  growth: z.object({
    sizes: z.array(z.number().int()).describe("Five doubling sizes."),
    spaceSizes: z.array(z.number().int()).describe("Three or more of the smaller sizes."),
    describe: text,
    generator: text.describe("Python source defining make_input(n) -> list with one value per input field: a worst case of size n."),
  }),
  edgeCases: z.array(text).describe("Each a JSON array, one value per input field."),
});

const Field = z.object({
  name: text,
  type: z.enum(["int", "int-list", "string", "tree", "linked-list"]),
  min: z.number().int().optional(),
  max: z.number().int().optional(),
  hint: text.optional(),
  rule: z.enum(["sorted-unique", "brackets-only"]).optional(),
});

export const BriefSchema = z.object({
  slug: text.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  title: text,
  leetcode: z.object({ number: z.number().int(), slug: text }),
  pattern: z.enum(PATTERNS),
  statement: text,
  entry: text.regex(/^[a-z_][a-z0-9_]*$/),
  inputs: z.array(Field).min(1),
  examples: z.array(z.object({ values: z.array(z.unknown()), expected: z.unknown() })).min(2),
  precondition: text.optional(),
  guidance: text.optional(),
});

// The schemas must produce exactly the app's types.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const draftMatches: Same<z.infer<typeof DraftSchema>, Draft> = true;
const briefMatches: Same<Omit<z.infer<typeof BriefSchema>, "examples">, Omit<Brief, "examples">> = true;
void draftMatches; void briefMatches;
