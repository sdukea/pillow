// Measures a lesson's approaches: steps at growing sizes, peak extra memory, and every line that
// runs (including on edge cases). Shared by the build and the tests so both check the same thing.

import { extraSpace, stepsOf } from "../../engine/analysis/growth";
import { validateSpec } from "../../engine/interpreter/validate";
import type { Trace, TraceRequest } from "../../engine/tracer/types";
import type { Problem } from "./problems";
import type { Measured } from "./validateLesson";

/** Runs the tracer: CPython for trusted solutions, the sandbox for AI drafts. */
export type RunTracer = (request: TraceRequest) => Trace | Promise<Trace>;

export async function measureLesson(problem: Problem, sourceOf: (solution: string) => string, run: RunTracer): Promise<Measured> {
  const lesson = problem.lesson;
  if (!lesson) throw new Error(`${problem.slug} has no lesson`);
  const measured: Measured = { sizes: lesson.growth.sizes, spaceSizes: lesson.growth.spaceSizes, approaches: {} };

  for (const approach of problem.approaches) {
    const source = sourceOf(approach.solution);
    const lines = new Set<number>();
    const addLines = (t: Trace) => Object.keys(t.lineHits).forEach((l) => lines.add(Number(l)));

    const steps: number[] = [];
    for (const n of lesson.growth.sizes) {
      const t = await run({ source, entry: approach.entry, args: lesson.growth.input(n), countOnly: true, maxSteps: 5_000_000 });
      if (!t.ok) throw new Error(`${approach.name} failed at n = ${n}: ${t.error?.message}`);
      addLines(t);
      steps.push(stepsOf(t));
    }
    addLines(await run({ source, entry: approach.entry, args: problem.example, countOnly: true }));

    // Edge cases must trace, their narration must hold, and their lines need explanations.
    for (const args of lesson.edgeCases) {
      const t = await run({ source, entry: approach.entry, args });
      if (!t.ok) throw new Error(`${approach.name} failed on edge case ${JSON.stringify(args)}: ${t.error?.message}`);
      const issues = validateSpec(approach.spec, source, [t], { requireViews: false });
      if (issues.length) throw new Error(`${approach.name} on edge case ${JSON.stringify(args)}:\n${issues.map((p) => `      ${p.where}: ${p.message}`).join("\n")}`);
      addLines(t);
    }

    const space: number[] = [];
    for (const n of lesson.growth.spaceSizes) space.push(extraSpace(await run({ source, entry: approach.entry, args: lesson.growth.input(n), maxSteps: 50_000 })));
    measured.approaches[approach.id] = { steps, space, lines: [...lines].sort((a, b) => a - b) };
  }
  return measured;
}
