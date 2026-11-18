// A problem's lesson as a short film: a fixed sequence of scenes that plays on its own, from the
// question to the obvious idea, what it wastes, the insight, the better idea, and the takeaway.
// Pure: built from the same lesson data and real traces as the full lesson, nothing invented.

import type { ViewSpec, VizSpec } from "../../engine/interpreter/spec";
import type { Approach, Problem } from "../content/problems";

export type Scene =
  | { kind: "question"; id: string; title: string; statement: string; example: string; output: string; picture: VizSpec }
  | { kind: "idea"; id: string; eyebrow: string; headline: string; body: string }
  | { kind: "run"; id: string; eyebrow: string; approach: Approach; caption: string }
  | { kind: "race"; id: string; eyebrow: string; headline: string; unit: string; note: string; rows: { name: string; complexity: string; value: number }[] }
  | { kind: "remember"; id: string; pattern: string; recognize: string; takeaway: string };

export interface Film { problem: Problem; scenes: Scene[] }

export function buildFilm(problem: Problem, growth?: { sizes: number[]; spaceSizes: number[]; approaches: Record<string, { steps: number[]; space: number[] }> }): Film {
  const lesson = problem.lesson;
  if (!lesson) throw new Error(`${problem.slug} has no lesson to film`);
  const [first, better] = [problem.approaches[0], problem.approaches.at(-1)!];
  const a = lesson.approaches[first.id];
  const b = lesson.approaches[better.id];
  const O = (c: { time: string; timeLabel?: string }) => c.timeLabel ?? `O(${c.time})`;
  const OS = (c: { space: string; spaceLabel?: string }) => c.spaceLabel ?? `O(${c.space})`;

  const scenes: Scene[] = [
    { kind: "question", id: "question", title: problem.title, statement: lesson.understand.statement, example: problem.exampleLabel, output: lesson.understand.output, picture: inputPicture(problem) },
    { kind: "idea", id: "obvious", eyebrow: "The obvious idea", headline: a.headline, body: a.intuition },
    { kind: "run", id: "run-obvious", eyebrow: a.headline, approach: first, caption: `${first.name}, on the example` },
  ];
  if (b.insight && better !== first) {
    scenes.push(
      { kind: "idea", id: "waste", eyebrow: "Where it wastes time", headline: firstSentence(b.insight.inefficiency), body: b.insight.repeatedWork },
      { kind: "idea", id: "insight", eyebrow: "The insight", headline: firstSentence(b.insight.observation), body: b.insight.technique },
      { kind: "run", id: "run-better", eyebrow: b.headline, approach: better, caption: `${better.name}, on the same example` },
    );
  }
  if (growth && better !== first) {
    // Race on whatever actually differs: time, or (when both take the same time) memory.
    const sameTime = a.complexity.time === b.complexity.time;
    const n = sameTime ? growth.spaceSizes.at(-1)! : growth.sizes.at(-1)!;
    scenes.push({
      kind: "race",
      id: "race",
      eyebrow: sameTime ? "Same speed, different memory" : "Side by side",
      headline: `On ${n} items`,
      unit: sameTime ? "items held at once" : "steps",
      note: sameTime ? "Both visit every item once. Measured by running both and counting what each holds in memory." : "Measured by running both and counting every line.",
      rows: problem.approaches.map((ap) => {
        const c = lesson.approaches[ap.id].complexity;
        const m = growth.approaches[ap.id];
        return { name: ap.name, complexity: sameTime ? OS(c) : O(c), value: sameTime ? m.space.at(-1)! : m.steps.at(-1)! };
      }),
    });
  }
  scenes.push({ kind: "remember", id: "remember", pattern: lesson.compare.pattern.name, recognize: lesson.compare.pattern.recognize, takeaway: lesson.compare.takeaways[0] ?? "" });
  return { problem, scenes };
}

/** A spec that draws the inputs themselves, from their types: lists and strings as cells, numbers as values. */
export function inputPicture(problem: Problem): VizSpec {
  const views: ViewSpec[] = [];
  const scalars: string[] = [];
  for (const f of problem.inputs) {
    if (f.type === "int") scalars.push(f.name);
    else if (f.type === "tree") views.push({ kind: "tree", id: `in-${f.name}`, root: f.name, current: f.name, label: f.name, showReturns: false });
    else if (f.type === "linked-list") views.push({ kind: "linked-list", id: `in-${f.name}`, pointers: [f.name], label: f.name });
    else views.push({ kind: "array", id: `in-${f.name}`, of: f.name, label: f.name });
  }
  if (scalars.length) views.push({ kind: "vars", id: "in-vars", show: scalars });
  return { views, lines: {} };
}

/** The first sentence, for a headline: "Rescanning. After every…" → "Rescanning." */
export function firstSentence(text: string): string {
  const m = text.match(/^.+?[.!?](?=\s|$)/);
  return (m ? m[0] : text).trim();
}

// ------------------------------------------------------------------ timing

/** Reading time for a text scene: a calm pace, with a floor so short scenes still land. */
export function readingMs(...texts: string[]): number {
  const words = texts.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.min(14_000, Math.max(3_500, 1_200 + words * 260));
}

export const BEAT = 1_300; // one step at normal speed
const OPEN = 6;            // steps shown at normal speed at the start
const CLOSE = 3;           // …and at the end
const MONTAGE = 6_000;     // the fast-forwarded middle never takes longer than this

/**
 * How long each step of a run is on screen. The opening and the ending play at reading speed;
 * a long middle is fast-forwarded (but every step is still shown), so a 200-step brute force
 * and a 20-step optimal both fit in a film.
 */
export function runPacing(steps: number): number[] {
  if (steps <= OPEN + CLOSE + 4) return Array(steps).fill(BEAT);
  const middle = steps - OPEN - CLOSE;
  const fast = Math.max(60, Math.min(BEAT, MONTAGE / middle));
  return Array.from({ length: steps }, (_, i) => (i < OPEN || i >= steps - CLOSE ? BEAT : fast));
}

export function sceneMs(scene: Scene, runSteps?: number): number {
  switch (scene.kind) {
    case "question": return readingMs(scene.statement, scene.example) + 1_500;
    case "idea": return readingMs(scene.headline, scene.body);
    case "run": return runPacing(runSteps ?? 1).reduce((s, x) => s + x, 0) + 1_200;
    case "race": return 6_000;
    case "remember": return readingMs(scene.pattern, scene.recognize, scene.takeaway);
  }
}
