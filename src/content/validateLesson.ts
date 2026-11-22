// Lesson validation, run at build time (and in tests). A lesson ships only if every line that runs
// has an explanation and narration, every check question is well formed, and every complexity it
// claims matches what was measured.

import { classify, type GrowthClass } from "../../engine/analysis/growth";
import { conceptById } from "../knowledge/concepts";
import { misconceptionById } from "../knowledge/misconceptions";
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

  // Reasoning: a few well-formed questions, each with one right answer and real misconceptions.
  if (lesson.reasoning.length < 2 || lesson.reasoning.length > 3) out.push(`reasoning has ${lesson.reasoning.length} steps; use 2 or 3`);
  for (const [i, step] of lesson.reasoning.entries()) {
    const where = `reasoning step ${i + 1}`;
    if (step.choices.length < 3) out.push(`${where}: give at least 3 choices`);
    if (step.choices.filter((c) => c.correct).length !== 1) out.push(`${where}: exactly one choice must be correct`);
    if (step.hints.length < 1 || step.hints.length > 2) out.push(`${where}: give 1 or 2 hints`);
    for (const c of step.concepts) if (!conceptById.has(c)) out.push(`${where}: unknown concept "${c}"`);
    for (const c of step.choices) {
      if (!c.reply.trim()) out.push(`${where}: every choice needs a reply`);
      if (c.misconception && !misconceptionById.has(c.misconception)) out.push(`${where}: unknown misconception "${c.misconception}"`);
      if (c.correct && c.misconception) out.push(`${where}: the correct choice can't reveal a misconception`);
    }
  }

  // Why it's right, and what comes next in an interview.
  const order = Object.keys(lesson.approaches);
  const c = lesson.approaches[order[order.length - 1]]?.correctness;
  if (!c || !c.invariant.trim() || !c.whyCorrect.trim() || !c.ends.trim()) out.push(`approach "${order[order.length - 1]}": say why it's correct (invariant, whyCorrect, ends)`);
  const follow = lesson.followUps ?? [];
  if (follow.length < 1 || follow.length > 3) out.push(`give 1 to 3 follow-up questions (has ${follow.length})`);
  for (const [i, f] of follow.entries()) {
    if (!f.ask.trim() || !f.answer.trim()) out.push(`follow-up ${i + 1}: needs a question and an answer`);
    for (const k of f.concepts) if (!conceptById.has(k)) out.push(`follow-up ${i + 1}: unknown concept "${k}"`);
  }

  // The card is what learners keep, so it has to stay short and sharp.
  const LIMITS = { slow: 60, waste: 70, trick: 90, recognize: 70 } as const;
  for (const [k, max] of Object.entries(LIMITS) as [keyof typeof LIMITS, number][]) {
    const v = lesson.card[k]?.trim() ?? "";
    if (!v) out.push(`card.${k} is empty`);
    else if (v.length > max) out.push(`card.${k} is ${v.length} characters; keep it to ${max}`);
  }

  const ids = problem.approaches.map((a) => a.id);
  for (const id of Object.keys(lesson.approaches)) if (!ids.includes(id)) out.push(`lesson has an approach "${id}" the problem doesn't`);

  for (const approach of problem.approaches) {
    const al = lesson.approaches[approach.id];
    if (!al) { out.push(`${approach.name}: no lesson content`); continue; }
    const m = measured.approaches[approach.id];
    checkOf(approach.name, al.check);
    if (!al.concepts?.length) out.push(`${approach.name}: tag at least one concept`);
    if (!al.legend?.length) out.push(`${approach.name}: explain what's on screen (legend)`);
    for (const c of al.concepts ?? []) if (!conceptById.has(c)) out.push(`${approach.name}: unknown concept "${c}"`);

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
