// Converts a hand-written problem into the brief and draft formats. Used two ways:
//   - as the drafter's worked example, so the model sees a complete draft that passes every check;
//   - in tests, to prove the validator accepts good lessons (and, mutated, rejects bad ones).

import type { Arg, Trace, TraceRequest } from "../engine/tracer/types";
import type { Brief, Draft, DraftApproach } from "../src/content/draft";
import type { Problem } from "../src/content/problems";
import { plainResult } from "./result";

const values = (args: Arg[]) => args.map((a) => (a.kind === "value" ? a.value : a.values));

export function problemToDraft(problem: Problem, sourceOf: (solution: string) => string): Draft {
  const lesson = problem.lesson;
  if (!lesson) throw new Error(`${problem.slug} has no lesson`);
  const sizes = [...new Set([...lesson.growth.sizes, ...lesson.growth.spaceSizes])];
  const table = Object.fromEntries(sizes.map((n) => [n, values(lesson.growth.input(n))]));
  const approaches: DraftApproach[] = problem.approaches.map((a) => {
    const al = lesson.approaches[a.id];
    return {
      id: a.id,
      name: a.name,
      concepts: al.concepts,
      legend: al.legend,
      solution: sourceOf(a.solution).trimEnd() + "\n",
      spec: {
        views: a.spec.views,
        lines: Object.entries(a.spec.lines).map(([line, spec]) => ({ line: Number(line), ...spec, narrate: spec.narrate ?? [] })),
      },
      headline: al.headline,
      intuition: al.intuition,
      discovery: al.discovery,
      steps: al.steps,
      ...(al.insight ? { insight: al.insight } : {}),
      notes: Object.entries(al.notes).map(([line, note]) => ({ line: Number(line), ...note })),
      complexity: al.complexity,
      ...(al.whyNotEnough ? { whyNotEnough: al.whyNotEnough } : {}),
      ...(al.correctness ? { correctness: al.correctness } : {}),
      ...(al.check ? { check: al.check } : {}),
    };
  });
  return {
    summary: problem.summary,
    card: lesson.card,
    reasoning: lesson.reasoning,
    example: { values: JSON.stringify(values(problem.example)), label: problem.exampleLabel },
    understand: lesson.understand,
    approaches,
    compare: lesson.compare,
    growth: {
      sizes: lesson.growth.sizes,
      spaceSizes: lesson.growth.spaceSizes,
      describe: lesson.growth.describe,
      generator: `def make_input(n):\n    return ${JSON.stringify(table)}[str(n)]\n`.replace(/\bnull\b/g, "None").replace(/\btrue\b/g, "True").replace(/\bfalse\b/g, "False"),
    },
    edgeCases: lesson.edgeCases.map((args) => JSON.stringify(values(args))),
    ...(lesson.followUps ? { followUps: lesson.followUps } : {}),
  };
}

/** A brief for a hand-written problem, with expected outputs from its trusted reference solution. */
export async function problemToBrief(problem: Problem, sourceOf: (solution: string) => string, run: (r: TraceRequest) => Trace | Promise<Trace>): Promise<Brief> {
  const reference = problem.approaches.at(-1)!;
  const inputs = [problem.example, ...(problem.lesson?.edgeCases ?? [])];
  const examples = [];
  for (const args of inputs) {
    const t = await run({ source: sourceOf(reference.solution), entry: reference.entry, args });
    examples.push({ values: values(args), expected: plainResult(t) });
  }
  return {
    slug: problem.slug,
    title: problem.title,
    leetcode: problem.leetcode,
    pattern: problem.pattern,
    statement: problem.summary,
    entry: reference.entry,
    inputs: problem.inputs,
    ...(problem.precondition ? { precondition: problem.precondition } : {}),
    examples,
  };
}
