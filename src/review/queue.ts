// What's due for review: learning and understood concepts whose chance of recall has fallen to 90%,
// least likely to be remembered first. Shaky concepts aren't here: they're "Fix", on Home.
import type { ConceptId } from "../knowledge/concepts";
import type { Evidence } from "../knowledge/evidence";
import type { ConceptState } from "../knowledge/model";

export const SESSION_SIZE = 10;

export function dueForReview(states: Map<ConceptId, ConceptState>, limit = SESSION_SIZE): ConceptState[] {
  return [...states.values()]
    .filter((s) => s.due && (s.state === "learning" || s.state === "understood"))
    .sort((a, b) => (a.recall ?? 1) - (b.recall ?? 1) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

/** Past review answers, newest first. */
export const reviewHistory = (log: Evidence[], limit = 20) => log.filter((e) => e.review).sort((a, b) => b.at - a.at).slice(0, limit);
