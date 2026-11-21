// Six dimensions of knowing a concept, each derived from the evidence log like the overall state.
// One state hides real differences: you can recognise a sliding window without being able to write
// one. The dimensions say which part is there and which isn't, each with the evidence behind it.
//
//   exposure        met it at all                       any evidence
//   recognition     knows when it applies               recall (which trick fits this problem)
//   explanation     can say how it behaves and costs    predict, complexity, reason
//   implementation  can write it                        implement (passing, as fast as the trick)
//   transfer        uses it beyond one problem          right, unhinted, in two different problems
//   retention       still has it later                  right, unhinted, in sessions 8+ hours apart
//
// States: none → emerging (the first right, unhinted answer) → solid (two right answers from
// different questions, the latest right) → slipping (a wrong answer after that, or an overdue
// review). Coming back from slipping takes two right answers in a row. Hinted answers count
// toward exposure only.

import type { Evidence, Task } from "./evidence";
import type { ConceptState } from "./model";

export type Dimension = "exposure" | "recognition" | "explanation" | "implementation" | "transfer" | "retention";
export type DimensionLevel = "none" | "emerging" | "solid" | "slipping";

export interface DimensionState {
  dimension: Dimension;
  level: DimensionLevel;
  /** One sentence, from the evidence. */
  why: string;
}

export const DIMENSIONS: { id: Dimension; name: string; question: string }[] = [
  { id: "exposure", name: "Met it", question: "Have you come across it?" },
  { id: "recognition", name: "Spot it", question: "Do you know when it applies?" },
  { id: "explanation", name: "Explain it", question: "Can you say how it behaves and what it costs?" },
  { id: "implementation", name: "Write it", question: "Can you code it, fast enough?" },
  { id: "transfer", name: "Use it elsewhere", question: "Can you use it in more than one problem?" },
  { id: "retention", name: "Keep it", question: "Do you still have it later?" },
];

const TASKS: Partial<Record<Dimension, Task[]>> = {
  recognition: ["recall"],
  explanation: ["predict", "complexity", "reason"],
  implementation: ["implement"],
};

const SESSION_GAP = 8 * 3_600_000;
const clean = (e: Evidence) => e.correct === true && !e.hinted;

/** Right answers in a row, from the newest graded one back. */
function streak(graded: Evidence[]): number {
  let n = 0;
  for (const e of graded) { if (e.correct) n++; else break; }
  return n;
}

/** The none / emerging / solid / slipping ladder over graded evidence (newest first). */
function ladder(graded: Evidence[], solidEnough: (cleanOnes: Evidence[]) => boolean): DimensionLevel {
  const right = graded.filter(clean);
  if (!right.length) return "none";
  if (!graded[0].correct) {
    // A miss only counts as slipping if what came before it was solid.
    const before = graded.slice(graded.findIndex((e) => e.correct));
    return ladder(before, solidEnough) === "solid" ? "slipping" : "emerging";
  }
  const hadWrong = graded.some((e) => e.correct === false);
  // After any wrong answer, coming back takes two right answers in a row.
  if (solidEnough(right) && (!hadWrong || streak(graded) >= 2)) return "solid";
  return "emerging";
}

const differentQuestions = (right: Evidence[]) => right.length >= 2 && new Set(right.map((e) => `${e.task}|${e.problem}`)).size >= 2;

export function dimensionsOf(state: ConceptState): DimensionState[] {
  const graded = state.evidence.filter((e) => e.correct !== undefined); // newest first
  return DIMENSIONS.map(({ id }) => ({ dimension: id, ...judge(id, state, graded) }));
}

function judge(id: Dimension, state: ConceptState, graded: Evidence[]): Omit<DimensionState, "dimension"> {
  if (id === "exposure") {
    const problems = new Set(state.evidence.map((e) => e.problem)).size;
    return problems ? { level: "solid", why: `Met in ${problems === 1 ? "one problem" : `${problems} problems`}.` } : { level: "none", why: "Not met yet." };
  }

  const tasks = TASKS[id];
  if (tasks) {
    const mine = graded.filter((e) => tasks.includes(e.task));
    const level = ladder(mine, differentQuestions);
    const tried = mine.length > 0;
    const why: Record<DimensionLevel, string> = {
      none: tried ? "Tried, but not right without a hint yet." : NOT_YET[id as keyof typeof NOT_YET],
      emerging: mine[0] && !mine[0].correct ? `Started, but missed most recently: ${mine[0].detail}.` : "Right once. One more right answer, in a different question, makes it solid.",
      solid: `Right ${mine.filter(clean).length} times without hints.`,
      slipping: `Missed most recently: ${mine[0]?.detail ?? "a question"}.`,
    };
    return { level, why: why[level] };
  }

  if (id === "transfer") {
    const problems = new Set(graded.filter(clean).map((e) => e.problem));
    const level = ladder(graded, (r) => new Set(r.map((e) => e.problem)).size >= 2);
    const why: Record<DimensionLevel, string> = {
      none: "Not used yet: answer a question about it in any problem.",
      emerging: problems.size >= 2 ? "Used in two problems; get the next one right to make it solid again." : "Used in one problem so far. Use it in another to show it transfers.",
      solid: `Used correctly in ${problems.size} problems.`,
      slipping: "Missed in the most recent problem.",
    };
    return { level, why: why[level] };
  }

  // retention
  const right = graded.filter(clean);
  const span = right.length ? right[0].at - right[right.length - 1].at : 0;
  let level = ladder(graded, (r) => r[0].at - r[r.length - 1].at >= SESSION_GAP);
  if (level === "solid" && state.state === "understood" && state.due) level = "slipping";
  const why: Record<DimensionLevel, string> = {
    none: "Nothing to keep yet.",
    emerging: span >= SESSION_GAP ? "Kept before; get the next one right to make it solid again." : "Right in one sitting so far. Come back after 8 hours to show it lasts.",
    solid: state.reviewAt ? `Still there. Next review ${new Date(state.reviewAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}.` : "Right in sessions at least 8 hours apart.",
    slipping: state.due && state.state === "understood" ? "A review is due: check it’s still there." : "Missed most recently.",
  };
  return { level, why: why[level] };
}

const NOT_YET: Record<"recognition" | "explanation" | "implementation", string> = {
  recognition: "Not tested yet: recall a problem’s trick from your notes.",
  explanation: "Not tested yet: predict a step, or say how the work grows.",
  implementation: "Not tested yet: write a solution yourself.",
};
