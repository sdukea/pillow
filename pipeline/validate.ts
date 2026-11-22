// The validation pipeline for AI drafts. Every check is deterministic and runs untrusted code only
// in the sandbox. A draft is publishable only when every check passes, and even then it still
// needs a named human reviewer (scripts/promote.ts).
//
//   1. shape         the draft parses, has two approaches, and its example and edge cases are
//                    valid inputs for the brief's fields
//   2. examples      every approach returns the brief's expected output on every brief example
//                    (the human-written ground truth)
//   3. agreement     the approaches agree with each other on 24 random valid inputs and every
//                    edge case (differential testing)
//   4. visualization every spec validates on the example and on random inputs, and every step draws
//   5. lesson        every line that runs is explained and narrated, checks are well formed, and
//                    each complexity claim matches measured growth

import { validateSpec } from "../engine/interpreter/validate";
import { prepare } from "../engine/interpreter/viewmodel";
import type { Sandbox } from "../engine/sandbox/sandbox";
import type { Arg, Trace } from "../engine/tracer/types";
import { type Brief, type Draft, toProblem, valuesToArgs } from "../src/content/draft";
import { generateInput, rng } from "../src/content/generate";
import { parseInputs, toText } from "../src/content/inputs";
import { measureLesson } from "../src/content/measure";
import type { Problem } from "../src/content/problems";
import { validateLesson } from "../src/content/validateLesson";
import { plainResult, sameResult } from "./result";
import { DraftSchema } from "./schema";

export type CheckName = "shape" | "examples" | "agreement" | "visualization" | "lesson";
export interface CheckResult { name: CheckName; ok: boolean; problems: string[] }
export interface Report { ok: boolean; checks: CheckResult[]; growthInputs?: Record<string, unknown[]> }

const RANDOM_INPUTS = 24;
const MAX = 12; // problems listed per check, so repair prompts stay focused

export async function validateDraft(brief: Brief, raw: unknown, sandbox: Sandbox): Promise<Report> {
  const checks: CheckResult[] = [];
  const add = (name: CheckName, problems: string[]) => { checks.push({ name, ok: problems.length === 0, problems: problems.slice(0, MAX).concat(problems.length > MAX ? [`…and ${problems.length - MAX} more`] : []) }); };
  const finish = (): Report => ({ ok: checks.length === 5 && checks.every((c) => c.ok), checks });

  // ---------------------------------------------------------------- 1. shape
  const parsed = DraftSchema.safeParse(raw);
  if (!parsed.success) { add("shape", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)); return finish(); }
  const draft: Draft = parsed.data;
  const shape: string[] = [];
  if (draft.approaches.length !== 2) shape.push(`there must be exactly 2 approaches (there are ${draft.approaches.length})`);
  const ids = draft.approaches.map((a) => a.id);
  if (new Set(ids).size !== ids.length) shape.push("approach ids must be different");
  for (const a of draft.approaches) {
    if (!/^[a-z]+(-[a-z]+)*$/.test(a.id)) shape.push(`approach id "${a.id}" must be kebab-case letters`);
    if (!new RegExp(`^def ${brief.entry}\\(`, "m").test(a.solution)) shape.push(`${a.name}: the solution must define ${brief.entry}(…)`);
  }
  const first = draft.approaches[0], last = draft.approaches.at(-1);
  if (first && !first.whyNotEnough) shape.push(`${first.name}: the first approach needs whyNotEnough`);
  if (last && last !== first && !last.insight) shape.push(`${last.name}: the better approach needs an insight`);
  if (last && last !== first && !last.correctness) shape.push(`${last.name}: the better approach needs correctness (invariant, whyCorrect, ends)`);
  if (!draft.followUps?.length) shape.push("give 1 to 3 follow-up questions");
  const sizes = draft.growth.sizes;
  if (sizes.length < 5) shape.push("growth needs at least 5 sizes");
  if (sizes.some((n, i) => i > 0 && n < 1.8 * sizes[i - 1])) shape.push("growth sizes should roughly double");
  if (draft.growth.spaceSizes.length < 3) shape.push("growth needs at least 3 space sizes");
  if (!/^def make_input\(n\)/m.test(draft.growth.generator)) shape.push("the growth generator must define make_input(n)");

  const asInput = (where: string, json: string): Arg[] | null => {
    try {
      const args = valuesToArgs(brief.inputs, JSON.parse(json));
      const p = parseInputs(brief.inputs, brief.inputs.map((f, i) => toText(f, args[i])));
      if (!p.ok) { shape.push(`${where}: ${p.field}: ${p.message}`); return null; }
      return p.args;
    } catch (e) { shape.push(`${where}: ${(e as Error).message}`); return null; }
  };
  const example = asInput("example", draft.example.values);
  const edgeCases = draft.edgeCases.map((e, i) => asInput(`edge case ${i + 1}`, e));
  if (draft.edgeCases.length === 0) shape.push("include at least one edge case");

  // The generator is untrusted code too: run it in the sandbox, at every size.
  const growthInputs: Record<string, unknown[]> = {};
  for (const n of new Set([...sizes, ...draft.growth.spaceSizes])) {
    try {
      const values = await sandbox.call(draft.growth.generator, "make_input", [n]);
      valuesToArgs(brief.inputs, values as unknown[]);
      growthInputs[String(n)] = values as unknown[];
    } catch (e) { shape.push(`make_input(${n}): ${(e as Error).message}`); }
  }
  add("shape", shape);
  if (shape.length) return finish();

  const problem = toProblem(brief, draft, growthInputs);
  const sources = new Map(problem.approaches.map((a, i) => [a.solution, draft.approaches[i].solution]));
  const run = (approach: Problem["approaches"][number], args: Arg[], maxSteps = 20_000) =>
    sandbox.trace({ source: sources.get(approach.solution)!, entry: approach.entry, args, maxSteps });
  const values = (args: Arg[]) => args.map((a) => (a.kind === "value" ? a.value : a.values));
  const describe = (args: Arg[]) => JSON.stringify(values(args));

  // ---------------------------------------------------------------- 2. examples
  const exampleProblems: string[] = [];
  for (const ex of brief.examples) {
    const args = valuesToArgs(brief.inputs, ex.values);
    for (const a of problem.approaches) {
      const t = await safeTrace(() => run(a, args));
      if (typeof t === "string") { exampleProblems.push(`${a.name} on ${describe(args)}: ${t}`); continue; }
      const got = plainResult(t);
      if (!sameResult(got, ex.expected)) exampleProblems.push(`${a.name} on ${describe(args)}: returned ${JSON.stringify(got)}, expected ${JSON.stringify(ex.expected)}`);
    }
  }
  add("examples", exampleProblems);

  // ---------------------------------------------------------------- 3. agreement
  const r = rng([...brief.slug].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2 ** 31, 7));
  const randomInputs: Arg[][] = [];
  const agreement: string[] = [];
  for (let tries = 0; randomInputs.length < RANDOM_INPUTS && tries < 3000; tries++) {
    const args = generateInput(brief.inputs, r);
    if (brief.precondition) {
      try { if ((await sandbox.call(brief.precondition, "valid", values(args))) !== true) continue; }
      catch (e) { agreement.push(`the brief's precondition failed: ${(e as Error).message}`); break; }
    }
    randomInputs.push(args);
  }
  if (randomInputs.length < RANDOM_INPUTS / 2) agreement.push(`only ${randomInputs.length} random inputs satisfied the precondition`);
  const agreeOn = [...randomInputs, ...(edgeCases as Arg[][])];
  const tracesByInput: Trace[][] = [];
  for (const args of agreeOn) {
    const traces: Trace[] = [];
    const results: string[] = [];
    for (const a of problem.approaches) {
      const t = await safeTrace(() => run(a, args));
      if (typeof t === "string") { agreement.push(`${a.name} on ${describe(args)}: ${t}`); continue; }
      traces.push(t);
      results.push(`${a.name} returned ${JSON.stringify(plainResult(t))}`);
    }
    tracesByInput.push(traces);
    if (traces.length === problem.approaches.length && !traces.every((t) => sameResult(plainResult(t), plainResult(traces[0])))) {
      agreement.push(`on ${describe(args)} the approaches disagree: ${results.join("; ")}`);
    }
  }
  add("agreement", agreement);

  // ---------------------------------------------------------------- 4. visualization
  const viz: string[] = [];
  for (const [i, a] of problem.approaches.entries()) {
    const source = sources.get(a.solution)!;
    const t = example && (await safeTrace(() => run(a, example)));
    if (typeof t === "string" || !t) { viz.push(`${a.name} on the example: ${t ?? "no example"}`); continue; }
    for (const p of validateSpec(a.spec, source, [t])) viz.push(`${a.name} (example) ${p.where}: ${p.message}`);
    const others = tracesByInput.map((ts) => ts[i]).filter(Boolean);
    for (const [k, other] of others.entries()) {
      for (const p of validateSpec(a.spec, source, [other], { requireViews: false })) viz.push(`${a.name} on ${describe(agreeOn[k])} ${p.where}: ${p.message}`);
    }
    for (const trace of [t, ...others]) {
      try {
        const prepared = prepare(trace, a.spec);
        for (let m = 0; m < prepared.moments.length; m++) prepared.view(m);
      } catch (e) { viz.push(`${a.name}: a step couldn't be drawn: ${(e as Error).message}`); break; }
    }
  }
  add("visualization", [...new Set(viz)]);

  // ---------------------------------------------------------------- 5. lesson
  let lessonProblems: string[];
  try {
    const measured = await measureLesson(problem, (name) => sources.get(name)!, (req) => sandbox.trace(req));
    lessonProblems = validateLesson(problem, measured);
  } catch (e) { lessonProblems = [(e as Error).message]; }
  add("lesson", lessonProblems);

  return { ...finish(), growthInputs };
}

async function safeTrace(f: () => Promise<Trace>): Promise<Trace | string> {
  try {
    const t = await f();
    if (t.truncated) return "ran too long (step limit reached)";
    if (!t.ok) return `raised ${t.error?.type}: ${t.error?.message}`;
    return t;
  } catch (e) { return (e as Error).message; }
}

export function reportMarkdown(brief: Brief, report: Report, attempt: number): string {
  const lines = [`# Draft check: ${brief.title}`, "", `Attempt ${attempt}: **${report.ok ? "all checks passed" : "not publishable yet"}**`, ""];
  const all: CheckName[] = ["shape", "examples", "agreement", "visualization", "lesson"];
  for (const name of all) {
    const c = report.checks.find((x) => x.name === name);
    lines.push(`- ${c ? (c.ok ? "✓" : "✗") : "·"} **${name}**${c ? "" : " (not run: an earlier check failed)"}`);
    for (const p of c?.problems ?? []) lines.push(`  - ${p}`);
  }
  return lines.join("\n") + "\n";
}
