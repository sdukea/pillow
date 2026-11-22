// Review questions: four kinds, so recall isn't one memorised answer.
//   concept       "Which idea fits?" for a concept's "use it when"          → recall (Spot it)
//   pattern       a problem's trick, among other problems' tricks          → recall (Spot it)
//   reconstruct   which line comes next in the optimal solution            → reconstruct (Explain it)
//   complexity    how the optimal solution's work grows                    → complexity (Explain it)
// Every answer is true by construction: taken from the ontology, the lesson, the real solution or
// measured growth. Kinds rotate with each review of the concept.
import type { Problem } from "../content/problems";
import { CONCEPTS, conceptById, type ConceptId } from "../knowledge/concepts";
import type { Task } from "../knowledge/evidence";
import { complexityFor, recallFor } from "../knowledge/questions";

export type ReviewKind = "concept" | "pattern" | "reconstruct" | "complexity";

export interface ReviewQuestion {
  kind: ReviewKind;
  concept: ConceptId;
  /** The problem it's asked through, or "review" for questions about the concept itself. */
  problem: string;
  task: Task;
  prompt: string;
  /** Code shown above the choices (reconstruction). */
  code?: string[];
  choices: { label: string; correct: boolean }[];
  detail: string;
}

/** A deterministic shuffle from a numeric seed. */
function shuffle<T>(xs: T[], seed: number): T[] {
  const out = [...xs];
  let h = (seed * 2654435761) >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function conceptQuestion(id: ConceptId, seed: number): ReviewQuestion {
  const c = conceptById.get(id)!;
  const others = shuffle(CONCEPTS.filter((x) => x.id !== id && x.kind === c.kind && x.useWhen !== c.useWhen), seed).slice(0, 3);
  return {
    kind: "concept", concept: id, problem: "review", task: "recall",
    prompt: `Which one do you reach for? “${c.useWhen}”`,
    choices: [{ label: c.name, correct: true }, ...others.map((o) => ({ label: o.name, correct: false }))],
    detail: `Review: when to use ${c.name.toLowerCase()}`,
  };
}

export function patternQuestion(id: ConceptId, problem: Problem, all: Problem[], seed: number): ReviewQuestion | null {
  const q = recallFor(problem, all, seed);
  if (!q) return null;
  return { kind: "pattern", concept: id, problem: problem.slug, task: "recall", prompt: q.prompt, choices: q.choices, detail: `Review: the trick for ${problem.title}` };
}

export function complexityQuestion(id: ConceptId, problem: Problem): ReviewQuestion | null {
  const best = problem.approaches.at(-1)!;
  const q = complexityFor(problem, best.id);
  if (!q) return null;
  return { kind: "complexity", concept: id, problem: problem.slug, task: "complexity", prompt: `${problem.title}, the fast way (${best.name}). ${q.prompt}`, choices: q.choices, detail: `Review: ${problem.title} grows ${q.detail}` };
}

/** "Which line comes next?" in the optimal solution, given the lines before it. */
export function reconstructQuestion(id: ConceptId, problem: Problem, source: string, seed: number): ReviewQuestion | null {
  const lines = source.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
  const trimmed = lines.map((l) => l.trim());
  // Wrong options come only from lines further down: lines already shown would give it away.
  const later = (k: number) => [...new Set(trimmed.filter((t, i) => i > k && t !== trimmed[k]))];
  // A line worth asking about: after the signature, distinct, with at least two later lines to confuse it with.
  const candidates = lines.map((_, i) => i).filter((i) => i >= 2 && trimmed.indexOf(trimmed[i]) === i && later(i).length >= 2);
  if (!candidates.length) return null;
  const k = candidates[seed % candidates.length];
  const wrong = shuffle(later(k), seed).slice(0, 3);
  return {
    kind: "reconstruct", concept: id, problem: problem.slug, task: "reconstruct",
    prompt: `${problem.title}, the fast way. Which line comes next?`,
    code: lines.slice(0, k),
    choices: [{ label: trimmed[k], correct: true }, ...wrong.map((w) => ({ label: w, correct: false }))],
    detail: `Review: rebuilt a line of ${problem.title}`,
  };
}

/** Every kind of question available for a concept, in rotation order. */
export function reviewOptions(id: ConceptId, teaching: Problem[], all: Problem[], sourceOf: (p: Problem) => string, seed: number): ReviewQuestion[] {
  const out: ReviewQuestion[] = [conceptQuestion(id, seed)];
  const p = teaching.length ? teaching[seed % teaching.length] : null;
  if (p) {
    for (const q of [patternQuestion(id, p, all, seed), reconstructQuestion(id, p, sourceOf(p), seed), complexityQuestion(id, p)]) if (q) out.push(q);
  }
  return out;
}

/** The question for this review: kinds rotate with each review of the concept. */
export function reviewQuestion(id: ConceptId, reviews: number, teaching: Problem[], all: Problem[], sourceOf: (p: Problem) => string): ReviewQuestion {
  const options = reviewOptions(id, teaching, all, sourceOf, reviews);
  return options[reviews % options.length];
}
