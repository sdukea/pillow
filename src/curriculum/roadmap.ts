// Where a student is in the 16-week plan, worked out from evidence alone (never from self-report).
import type { Evidence } from "../knowledge/evidence";
import type { ConceptId } from "../knowledge/concepts";
import type { ConceptState } from "../knowledge/model";
import { CURRICULUM, WEEKS, type CurriculumProblem } from "./curriculum";

export type Progress = "new" | "practised" | "solved";

/** Solved means writing a solution as fast as the trick, without opening the answer. */
export function progressOf(log: Evidence[], slug: string): Progress {
  const mine = log.filter((e) => e.problem === slug);
  if (mine.some((e) => e.task === "implement" && e.correct && !e.hinted)) return "solved";
  return mine.length ? "practised" : "new";
}

/** The first week that teaches a concept the student hasn't yet shown they understand. */
export function currentWeek(states: Map<ConceptId, ConceptState>): number {
  const open = WEEKS.find((w) => w.introduces.some((c) => states.get(c)?.state !== "understood"));
  return open?.week ?? WEEKS[WEEKS.length - 1].week;
}

/** The next problem to work on: the first one with a lesson, from the current week on, not yet solved. */
export function nextProblem(states: Map<ConceptId, ConceptState>, log: Evidence[]): CurriculumProblem | null {
  const week = currentWeek(states);
  return CURRICULUM.find((p) => p.week >= week && p.lesson === "built" && progressOf(log, p.slug) !== "solved")
    ?? CURRICULUM.find((p) => p.lesson === "built" && progressOf(log, p.slug) !== "solved")
    ?? null;
}
