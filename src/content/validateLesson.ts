// Lesson validation, run at build time (and in tests). A lesson ships only if every line that runs
// has an explanation and narration, every check question is well formed, and every complexity it
// claims matches what was measured.

import { classify, type GrowthClass } from "../../engine/analysis/growth";
import type { Problem } from "./problems";

export interface Measured {
  sizes: number[];
  spaceSizes: number[];
  approaches: Record<string, { steps: number[]; space: number[]; lines: number[] }>;
}

export function validateLesson(problem: Problem, measured: Measured): string[] {
  const lesson = problem.lesson;
  if (!lesson) return [];
  const out: string[] = [];
  const checkOf = (where: string, c?: { options: string[]; answer: number }) => {
    if (c && !(c.answer >= 0 && c.answer < c.options.length)) out.push(`${where}: the check's answer isn't one of its options`);
  };
  checkOf("understand", lesson.understand.check);

  const ids = problem.approaches.map((a) => a.id);
  for (const id of Object.keys(lesson.approaches)) if (!ids.includes(id)) out.push(`lesson has an approach "${id}" the problem doesn't`);

  for (const approach of problem.approaches) {
    const al = lesson.approaches[approach.id];
    if (!al) { out.push(`${approach.name}: no lesson content`); continue; }
    const m = measured.approaches[approach.id];
    checkOf(approach.name, al.check);

    // Every line that ran in any measurement needs a note and narration.
    for (const line of m.lines) {
      if (!al.notes[line]) out.push(`${approach.name}: line ${line} runs but has no explanation`);
      if (!approach.spec.lines[line]?.narrate?.length) out.push(`${approach.name}: line ${line} runs but has no narration`);
    }
    for (const line of Object.keys(al.notes).map(Number)) {
      if (!m.lines.includes(line)) out.push(`${approach.name}: line ${line} has an explanation but never runs`);
    }

    const time = classify(measured.sizes.map((n, i) => ({ n, value: m.steps[i] })));
    const space = classify(measured.spaceSizes.map((n, i) => ({ n, value: m.space[i] })));
    const label = (g: GrowthClass) => `O(${g})`;
    if (time !== al.complexity.time) out.push(`${approach.name}: claims ${label(al.complexity.time)} time, but measured growth looks like ${label(time)} (${m.steps.join(", ")} steps)`);
    if (space !== al.complexity.space) out.push(`${approach.name}: claims ${label(al.complexity.space)} space, but measured growth looks like ${label(space)} (${m.space.join(", ")} extra elements)`);
  }
  return out;
}
