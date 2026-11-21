// The student model: a pure function from evidence to a state per concept. No percentages and no
// hidden scores. Every state comes with the evidence that produced it, so the map can explain
// itself and the student can trust it.
//
//   unseen      nothing yet
//   seen        watched it, never answered anything about it
//   learning    has answered, but not consistently right yet
//   shaky       the most recent answer was wrong
//   understood  at least two right answers without hints, from different tasks or problems, the
//               most recent one right, AND either retention (right in two sessions at least 8 hours
//               apart) or transfer (right in two different problems). Answering correctly seconds
//               after being shown something is short-term memory, not understanding.
// An understood concept comes back for review on a spaced schedule (1, 2, 4, 8… days after each
// streak of right answers). Reviewing it right pushes the next review further out.

import { CONCEPTS, type ConceptId } from "./concepts";
import type { Evidence } from "./evidence";
import { type Misconception, misconceptionById } from "./misconceptions";

export type State = "unseen" | "seen" | "learning" | "shaky" | "understood";

export interface ConceptState {
  id: ConceptId;
  state: State;
  /** For understood concepts: when it's next worth reviewing, and whether that's now. */
  reviewAt?: number;
  due: boolean;
  /** The evidence behind the state, newest first. */
  evidence: Evidence[];
  /** Misconceptions shown since the last right answer without hints: what still seems off. */
  misconceptions: Misconception[];
  /** One sentence explaining the state, from the evidence. */
  why: string;
}

const DAY = 86_400_000;
const SESSION_GAP = 8 * 3_600_000;

export function assess(log: Evidence[], now = Date.now()): Map<ConceptId, ConceptState> {
  const out = new Map<ConceptId, ConceptState>();
  for (const c of CONCEPTS) out.set(c.id, judge(c.id, log.filter((e) => e.concepts.includes(c.id)), now));
  return out;
}

function judge(id: ConceptId, events: Evidence[], now: number): ConceptState {
  const evidence = [...events].sort((a, b) => b.at - a.at);
  const graded = evidence.filter((e) => e.correct !== undefined);
  // Misconceptions shown since the last clean right answer still stand.
  const lastClean = graded.findIndex((e) => e.correct && !e.hinted);
  const recent = lastClean === -1 ? graded : graded.slice(0, lastClean);
  const misconceptions = [...new Set(recent.flatMap((e) => (e.misconception ? [e.misconception] : [])))]
    .map((m) => misconceptionById.get(m)).filter((m): m is Misconception => !!m);
  const base = { id, evidence, misconceptions };
  if (!evidence.length) return { ...base, state: "unseen", due: false, why: "Not met yet." };
  if (!graded.length) return { ...base, state: "seen", due: false, why: "Watched, but not tested yet. Seeing isn’t understanding." };

  const latest = graded[0];
  if (!latest.correct) {
    const m = latest.misconception && misconceptionById.get(latest.misconception);
    return { ...base, state: "shaky", due: true, why: m ? `You seemed to think ${m.belief}.` : `Missed most recently: ${latest.detail}.` };
  }
  const clean = graded.filter((e) => e.correct && !e.hinted);
  const sources = new Set(clean.map((e) => `${e.task}|${e.problem}`));
  // Placement-check answers show what a student knew coming in, but never count as using a concept
  // in another problem: they're one sitting, about many concepts.
  const problems = new Set(clean.filter((e) => e.task !== "diagnostic").map((e) => e.problem));
  const span = clean.length ? clean[0].at - clean[clean.length - 1].at : 0;
  const lasting = problems.size >= 2 || span >= SESSION_GAP;
  if (clean.length >= 2 && sources.size >= 2 && lasting) {
    // Consecutive right answers from the newest backwards set the review interval.
    let streak = 0;
    for (const e of graded) { if (e.correct) streak++; else break; }
    const reviewAt = latest.at + DAY * 2 ** Math.min(streak - 2, 6);
    const due = now >= reviewAt;
    return {
      ...base, state: "understood", reviewAt, due,
      why: due ? "Understood before. Time to check it’s still there." : `Answered right ${clean.length} times without hints.`,
    };
  }
  const need = Math.max(0, 2 - clean.length);
  return {
    ...base, state: "learning", due: false,
    why: need
      ? `Right so far. ${need} more right answer${need > 1 ? "s" : ""} without hints to show it’s understood.`
      : sources.size < 2 ? "Right so far. Show it in another kind of question too."
      : "Right today. Recall it in a later session, or use it in another problem, to show it lasts.",
  };
}

/** Counts by state, for a one-line summary. */
export function summarize(states: Map<ConceptId, ConceptState>) {
  const counts: Record<State, number> = { unseen: 0, seen: 0, learning: 0, shaky: 0, understood: 0 };
  let due = 0;
  for (const s of states.values()) { counts[s.state]++; if (s.state === "understood" && s.due) due++; }
  return { ...counts, due };
}
