// The placement check's flow, as pure functions of the answers so far.
//   Each teaching week, in order: the recognition question first. Right → the week is passed.
//   Wrong → the explanation question, as a second chance. Right → passed. Wrong → stop here.
//   "I haven't learned this yet" stops immediately: the student has told us.
// Only right answers become evidence, so a beginner isn't marked as struggling with things they
// were never taught; the placement is later re-derived from that evidence alone.
import { DIAGNOSTIC, type DiagnosticQuestion } from "./questions";

export type Outcome = "right" | "wrong" | "skip";
export interface Answer { id: string; outcome: Outcome }

const TEACHING_WEEKS = [...new Set(DIAGNOSTIC.map((q) => q.week))].sort((a, b) => a - b);
const byId = new Map(DIAGNOSTIC.map((q) => [q.id, q]));
const ask = (week: number, facet: DiagnosticQuestion["facet"]) => DIAGNOSTIC.find((q) => q.week === week && q.facet === facet)!;

export interface Progress {
  /** The question to ask now, or null when the check is over. */
  next: DiagnosticQuestion | null;
  /** Weeks passed, in order. */
  passed: number[];
  /** The week to start at: the first one not passed (16, the review week, if all are). */
  placed: number;
}

export function progress(answers: Answer[]): Progress {
  const passed: number[] = [];
  let i = 0;
  for (const week of TEACHING_WEEKS) {
    const first = answers[i];
    if (!first) return { next: ask(week, "recognition"), passed, placed: week };
    i++;
    if (first.outcome === "right") { passed.push(week); continue; }
    if (first.outcome === "skip") return { next: null, passed, placed: week };
    const second = answers[i];
    if (!second) return { next: ask(week, "explanation"), passed, placed: week };
    i++;
    if (second.outcome === "right") { passed.push(week); continue; }
    return { next: null, passed, placed: week };
  }
  return { next: null, passed, placed: TEACHING_WEEKS[TEACHING_WEEKS.length - 1] + 1 };
}

export const questionById = (id: string) => byId.get(id);
export const TOTAL_WEEKS = TEACHING_WEEKS.length;
