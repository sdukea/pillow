// Checking a solution the student wrote: against the reference solution on the example, the
// lesson's edge cases and random valid inputs, then for how its work grows. Pure apart from the
// runner it's given: the browser's Python worker in the app, CPython in tests.

import { classify, type GrowthClass, stepsOf } from "../../engine/analysis/growth";
import { plainResult, sameResult } from "../../engine/analysis/result";
import type { Arg, Trace, TraceRequest } from "../../engine/tracer/types";
import { generateInput, rng } from "../content/generate";
import { type InputField, labelOf } from "../content/inputs";
import type { Problem } from "../content/problems";

export type Runner = (request: TraceRequest) => Promise<Trace>;

export interface Case { args: Arg[]; label: string; kind: "example" | "edge case" | "random" }
export interface CaseResult extends Case {
  expected: unknown;
  got?: unknown;
  error?: { type: string; message: string; line?: number };
  pass: boolean;
}

/**
 * Anything a student's code can be checked against: a lesson's problem, or an interview problem.
 * Random cases need `inputs`; problems with inputs the generator can't make (lists of pairs) list
 * enough hand-picked cases instead.
 */
export interface Checkable {
  slug: string;
  entry: string;
  params: string[];
  example: Arg[];
  exampleLabel: string;
  edgeCases: Arg[][];
  inputs?: InputField[];
  precondition?: string;
  unordered?: boolean;
  /** Growing inputs, and the growth the best approach achieves. */
  growth?: { sizes: number[]; input: (n: number) => Arg[]; target: GrowthClass };
}

/** A lesson's problem, as something to check code against. */
export function checkableOf(problem: Problem): Checkable {
  const lesson = problem.lesson;
  const best = problem.approaches.at(-1)!;
  return {
    slug: problem.slug, entry: best.entry, params: problem.inputs.map((f) => f.name),
    example: problem.example, exampleLabel: problem.exampleLabel, edgeCases: lesson?.edgeCases ?? [],
    inputs: problem.inputs, precondition: problem.precondition, unordered: problem.unordered,
    growth: lesson ? { sizes: lesson.growth.sizes, input: lesson.growth.input, target: lesson.approaches[best.id].complexity.time } : undefined,
  };
}

const argValue = (a: Arg) => (a.kind === "value" ? a.value : a.values);
const label = (c: Checkable, args: Arg[]) => c.inputs ? labelOf(c.inputs, args) : c.params.map((p, i) => `${p} = ${JSON.stringify(argValue(args[i]))}`).join(", ");

/** A student's solution may do far more work than the reference; let it, within reason. */
export const SOLVE_MAX_STEPS = 200_000;
const RANDOM = 8;

/** The cases to check: the example, every edge case, and random valid inputs (seeded per problem). */
export async function buildCases(problem: Checkable, run: Runner): Promise<Case[]> {
  const cases: Case[] = [{ args: problem.example, label: problem.exampleLabel, kind: "example" }];
  for (const args of problem.edgeCases) cases.push({ args, label: label(problem, args), kind: "edge case" });
  if (!problem.inputs) return cases;
  const r = rng([...problem.slug].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2 ** 31, 11));
  const seen = new Set(cases.map((c) => JSON.stringify(c.args)));
  for (let tries = 0; cases.filter((c) => c.kind === "random").length < RANDOM && tries < 400; tries++) {
    const args = generateInput(problem.inputs, r);
    const key = JSON.stringify(args);
    if (seen.has(key)) continue;
    if (problem.precondition) {
      const ok = await run({ source: problem.precondition, entry: "valid", args, countOnly: true });
      if (!(ok.ok && ok.result === true)) continue;
    }
    seen.add(key);
    cases.push({ args, label: label(problem, args), kind: "random" });
  }
  return cases;
}

/** Normalize a result for comparison, honouring problems whose answer order doesn't matter. */
function normalized(problem: Checkable, t: Trace): unknown {
  const v = plainResult(t);
  return problem.unordered && Array.isArray(v) ? [...v].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : v;
}

export async function checkSolution(problem: Checkable, source: string, reference: string, run: Runner, cases: Case[]): Promise<CaseResult[]> {
  const entry = problem.entry;
  const out: CaseResult[] = [];
  for (const c of cases) {
    const want = await run({ source: reference, entry, args: c.args, countOnly: true });
    const got = await run({ source, entry, args: c.args, countOnly: true, maxSteps: SOLVE_MAX_STEPS });
    const expected = normalized(problem, want);
    if (!got.ok) {
      const error = got.truncated
        ? { type: "Too slow", message: `It ran more than ${SOLVE_MAX_STEPS.toLocaleString()} lines on this input. Is there an endless loop?` }
        : got.error ?? { type: "Error", message: "It stopped without an answer." };
      out.push({ ...c, expected, error, pass: false });
      continue;
    }
    const answer = normalized(problem, got);
    out.push({ ...c, expected, got: answer, pass: sameResult(answer, expected) });
  }
  return out;
}

export interface Growth { cls: GrowthClass; target: GrowthClass; sizes: number[]; steps: number[] }

/** How the student's solution grows, on the problem's growth inputs, against the best approach. */
export async function measureGrowth(problem: Checkable, source: string, run: Runner): Promise<Growth | null> {
  const g = problem.growth;
  if (!g) return null;
  const steps: number[] = [];
  for (const n of g.sizes) {
    const t = await run({ source, entry: problem.entry, args: g.input(n), countOnly: true, maxSteps: 3_000_000 });
    if (!t.ok) return null;
    steps.push(stepsOf(t));
  }
  const cls = classify(g.sizes.map((n, i) => ({ n, value: steps[i] })));
  return { cls, target: g.target, sizes: g.sizes, steps };
}

const ORDER: GrowthClass[] = ["1", "log n", "n", "n log n", "n²"];
/** Whether a growth class is as good as (or better than) the target. */
export const asGoodAs = (cls: GrowthClass, target: GrowthClass) => ORDER.indexOf(cls) <= ORDER.indexOf(target);

/** The starting code: the function and its parameters, ready to fill in. */
export function starter(problem: Checkable): string {
  return `def ${problem.entry}(${problem.params.join(", ")}):\n    `;
}

