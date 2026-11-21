// Where a student is in the plan, from evidence alone. No problem lists here, so Home can use it
// without loading the curriculum.
import type { ConceptId } from "../knowledge/concepts";
import type { Evidence } from "../knowledge/evidence";
import type { ConceptState } from "../knowledge/model";
import { WEEKS } from "./weeks";

const TEACHING = WEEKS.filter((w) => w.introduces.length).map((w) => w.week);

/** The week the placement check put the student at: the first teaching week it has no right answer
 *  for. A student who never took it, or missed week 1, starts at week 1. */
export function placementWeek(log: Evidence[]): number {
  const passed = new Set(log.filter((e) => e.task === "diagnostic" && e.correct && e.week).map((e) => e.week!));
  return TEACHING.find((w) => !passed.has(w)) ?? WEEKS[WEEKS.length - 1].week;
}

/** The week to work on: from the placement on, the first week that teaches a concept not yet understood. */
export function currentWeek(states: Map<ConceptId, ConceptState>, log: Evidence[] = []): number {
  const from = placementWeek(log);
  const open = WEEKS.find((w) => w.week >= from && w.introduces.some((c) => states.get(c)?.state !== "understood"));
  return open?.week ?? WEEKS[WEEKS.length - 1].week;
}
