// What to do next, decided from the student model: deterministic, and always with a reason.
//   1. A concept you missed (shaky), named misconceptions first: revisit the problem that tests it.
//   2. An understood concept due for review: recall it.
//   3. The frontier: a problem that teaches something new, whose prerequisites you understand
//      (or have no prerequisites), preferring the fewest unmet prerequisites.

import type { Problem } from "../content/problems";
import { type ConceptId, conceptById } from "./concepts";
import type { ConceptState } from "./model";

export interface Recommendation {
  kind: "fix" | "review" | "learn";
  problem: Problem;
  concept?: ConceptId;
  reason: string;
}

const conceptsOf = (p: Problem): ConceptId[] => [...new Set(p.approaches.flatMap((a) => p.lesson?.approaches[a.id]?.concepts ?? []))];

export function recommend(problems: Problem[], states: Map<ConceptId, ConceptState>): Recommendation[] {
  const out: Recommendation[] = [];
  const taught = problems.filter((p) => p.lesson);
  const name = (c: ConceptId) => conceptById.get(c)?.name ?? c;

  // Fix first what's most specific (a named misconception), then what was missed most recently.
  const shaky = [...states.values()].filter((s) => s.state === "shaky")
    .sort((a, b) => b.misconceptions.length - a.misconceptions.length || (b.evidence[0]?.at ?? 0) - (a.evidence[0]?.at ?? 0));
  for (const s of shaky) {
    const p = s.evidence.find((e) => e.correct === false && taught.some((x) => x.slug === e.problem));
    const problem = p && taught.find((x) => x.slug === p.problem);
    if (problem) out.push({ kind: "fix", problem, concept: s.id, reason: s.misconceptions.length ? s.why : `You missed ${name(s.id).toLowerCase()} last time.` });
  }
  for (const s of states.values()) {
    if (s.state !== "understood" || !s.due) continue;
    const problem = taught.find((p) => conceptsOf(p).includes(s.id));
    if (problem && !out.some((r) => r.problem.slug === problem.slug)) out.push({ kind: "review", problem, concept: s.id, reason: `Check you still remember ${name(s.id).toLowerCase()}.` });
  }

  const ready = (c: ConceptId) => (conceptById.get(c)?.requires ?? []).filter((r) => states.get(r as ConceptId)?.state !== "understood");
  const frontier = taught
    .map((p) => {
      const fresh = conceptsOf(p).filter((c) => !["understood", "learning"].includes(states.get(c)?.state ?? "unseen"));
      const unmet = new Set(fresh.flatMap(ready).filter((r) => !conceptsOf(p).includes(r as ConceptId)));
      return { p, fresh, unmet: unmet.size };
    })
    .filter((x) => x.fresh.length > 0 && !out.some((r) => r.problem.slug === x.p.slug))
    .sort((a, b) => a.unmet - b.unmet || b.fresh.length - a.fresh.length);
  for (const f of frontier.slice(0, 3)) {
    out.push({ kind: "learn", problem: f.p, concept: f.fresh[0], reason: `New for you: ${f.fresh.slice(0, 2).map(name).join(" and ").toLowerCase()}.` });
  }
  return out;
}
