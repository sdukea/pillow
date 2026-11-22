// Grading a mock interview, stage by stage, from what the student did. Pure functions: the screen
// supplies the choices, the code's test results and its measured growth.
import type { GrowthClass } from "../../engine/analysis/growth";
import { introWeek } from "../curriculum/weeks";
import type { Evidence } from "../knowledge/evidence";
import { asGoodAs, type CaseResult, type Growth } from "../solve/check";
import { INTERVIEWS, type InterviewProblem, type Time, TIMES } from "./problems";

export type Stage = "clarify" | "approach" | "implement" | "complexity" | "follow-up";
export const STAGES: Stage[] = ["clarify", "approach", "implement", "complexity", "follow-up"];
export type Level = "pass" | "partial" | "miss";
export interface Graded { level: Level; why: string }

const rank = (t: Time | GrowthClass) => TIMES.indexOf(t as Time);
const O = (t: string) => `O(${t})`;

/** Asking every question that matters, and at most one that doesn't. */
export function gradeClarify(p: InterviewProblem, picked: number[]): Graded {
  const matters = p.clarify.map((c, i) => (c.matters ? i : -1)).filter((i) => i >= 0);
  const hit = matters.filter((i) => picked.includes(i)).length;
  const extra = picked.filter((i) => !p.clarify[i].matters).length;
  if (hit === matters.length && extra <= 1) return { level: "pass", why: `You asked all ${matters.length} questions that change the solution.` };
  if (hit > 0) return { level: "partial", why: `You asked ${hit} of the ${matters.length} questions that change the solution${extra > 1 ? ", and several that don’t" : ""}.` };
  return { level: "miss", why: "None of your questions would change the solution. Ask about order, size and edge cases first." };
}

/** Choosing an optimal approach, and stating its cost. */
export function gradeApproach(p: InterviewProblem, chosen: number, claimed: Time): Graded {
  const a = p.approaches[chosen];
  const costRight = claimed === a.time;
  if (!a.works) return { level: "miss", why: `That approach doesn’t solve it: ${a.why}` };
  if (a.best && costRight) return { level: "pass", why: `An optimal approach, and its cost is right: ${O(a.time)}.` };
  if (a.best) return { level: "partial", why: `An optimal approach, but it costs ${O(a.time)}, not ${O(claimed)}.` };
  return { level: "partial", why: `It works, but it’s not optimal. ${a.why}${costRight ? "" : ` It costs ${O(a.time)}, not ${O(claimed)}.`}` };
}

/** A measurement below the problem's lower bound means the work hid inside single lines. */
export const hiddenWork = (p: InterviewProblem, growth: Growth | null) => !!growth && rank(growth.cls) < rank(p.lowerBound);

/** Every test passing, and growing as slowly as an optimal approach. */
export function gradeImplement(p: InterviewProblem, results: CaseResult[] | null, growth: Growth | null, chosen: number | null): Graded {
  if (!results) return { level: "miss", why: "No code was run." };
  const passed = results.filter((r) => r.pass).length;
  if (passed < results.length) return { level: "miss", why: `${passed} of ${results.length} tests pass.` };
  const all = `All ${results.length} tests pass`;
  if (!p.growth) return { level: "pass", why: `${all}.` };
  if (!growth) return { level: "partial", why: `${all}, but it was too slow to measure on bigger inputs.` };
  if (hiddenWork(p, growth)) {
    const best = chosen !== null && !!p.approaches[chosen]?.best;
    return { level: best ? "pass" : "partial", why: `${all}. Its work happens inside single lines Pillow can’t count, so its speed was judged by the approach you chose${best ? ", which is optimal" : ", which isn’t optimal"}.` };
  }
  if (asGoodAs(growth.cls, growth.target)) return { level: "pass", why: `${all}, and it grows like ${O(growth.cls)}.` };
  return { level: "partial", why: `${all}, but it grows like ${O(growth.cls)}; an optimal approach is ${O(growth.target)}.` };
}

/** Saying how your own code grows, checked against its measurement when there is one. */
export function gradeComplexity(p: InterviewProblem, claimed: Time, growth: Growth | null, implement: Graded, chosen: number | null): Graded {
  const working = implement.level !== "miss";
  if (working && growth && !hiddenWork(p, growth)) {
    return claimed === growth.cls
      ? { level: "pass", why: `Right: your code measures ${O(growth.cls)}.` }
      : { level: "miss", why: `Your code measures ${O(growth.cls)}, not ${O(claimed)}.` };
  }
  const a = chosen !== null ? p.approaches[chosen] : undefined;
  if (!a) return { level: "miss", why: "There was nothing to compare with." };
  const matches = claimed === a.time;
  if (working) return matches ? { level: "pass", why: `Right for the approach you chose: ${O(a.time)}.` } : { level: "miss", why: `The approach you chose costs ${O(a.time)}, not ${O(claimed)}.` };
  return matches
    ? { level: "partial", why: `That matches the approach you chose, but there was no working code to measure.` }
    : { level: "miss", why: `The approach you chose costs ${O(a.time)}, and there was no working code to measure.` };
}

export function gradeFollowUp(p: InterviewProblem, choice: number): Graded {
  const c = p.followUp.choices[choice];
  return c.correct ? { level: "pass", why: c.why } : { level: "miss", why: `${c.why} Better: ${p.followUp.choices.find((x) => x.correct)!.text.toLowerCase()}.` };
}

/** Passing means an optimal approach, working code and the right cost, with nothing missed elsewhere. */
export function passed(stages: Record<Stage, Graded>): boolean {
  return stages.approach.level === "pass" && stages.implement.level === "pass" && stages.complexity.level === "pass"
    && stages.clarify.level !== "miss" && stages["follow-up"].level !== "miss";
}

// ------------------------------------------------------------------ choosing and tracking interviews

export interface Report { slug: string; at: number; stages: Record<Stage, Graded & { seconds: number }>; passed: boolean }

/** The roadmap week an interview problem belongs to: when its last concept is taught. */
export const weekOf = (p: InterviewProblem) => Math.max(...p.concepts.map((c) => introWeek.get(c) ?? 16));

/**
 * The next interview: a problem the student hasn't met (no evidence on it, no earlier interview).
 * Prefer the latest one their roadmap week has reached; otherwise the earliest one left.
 */
export function nextInterview(log: Evidence[], reports: Report[], week: number): InterviewProblem | null {
  const met = new Set([...log.map((e) => e.problem), ...reports.map((r) => r.slug)]);
  const fresh = INTERVIEWS.filter((p) => !met.has(p.slug));
  const reached = fresh.filter((p) => weekOf(p) <= week).sort((a, b) => weekOf(b) - weekOf(a));
  return reached[0] ?? [...fresh].sort((a, b) => weekOf(a) - weekOf(b))[0] ?? null;
}

/** Readiness: of the last five mock interviews, how many passed. */
export function readiness(reports: Report[]): { passed: number; of: number } {
  const last = [...reports].sort((a, b) => b.at - a.at).slice(0, 5);
  return { passed: last.filter((r) => r.passed).length, of: last.length };
}

/** Which mastery dimension each stage's evidence feeds. */
export const STAGE_DIMENSION: Record<Stage, "recognition" | "implementation" | "explanation"> = {
  clarify: "recognition", approach: "recognition", implement: "implementation", complexity: "explanation", "follow-up": "explanation",
};
