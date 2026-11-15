// The chapters of a problem, in order. Pure, so the end-to-end tests can import it too.
import type { Problem } from "../content/problems";

export interface Chapter { id: string; label: string }

export function chaptersOf(problem: Problem): Chapter[] {
  if (!problem.lesson) return problem.approaches.map((a) => ({ id: a.id, label: a.name }));
  return [{ id: "understand", label: "Understand" }, ...problem.approaches.map((a) => ({ id: a.id, label: a.name })), { id: "compare", label: "Compare" }];
}
