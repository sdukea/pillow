// Spec validation, run at build time against real traces. A spec that mentions a variable that
// never exists, or narration that can't be filled in on some step, fails here rather than in
// front of a learner.

import type { Trace } from "../tracer/types";
import { evaluate, ExprError, parse } from "./expr";
import { buildMoments, scopeAt } from "./moments";
import { narrate } from "./narrate";
import type { VizSpec } from "./spec";

export interface Problem { where: string; message: string }

export function validateSpec(
  spec: VizSpec,
  source: string,
  traces: Trace[],
  /** Edge cases (an empty string, an empty tree) can legitimately end before a view's data exists. */
  { requireViews = true }: { requireViews?: boolean } = {},
): Problem[] {
  const problems: Problem[] = [];
  const lineCount = source.trimEnd().split("\n").length;
  const ids = new Set<string>();

  // Every expression must at least parse.
  const exprs: [string, string][] = [];
  for (const v of spec.views) {
    if (ids.has(v.id)) problems.push({ where: `view ${v.id}`, message: "duplicate view id" });
    ids.add(v.id);
    if ("of" in v) exprs.push([`view ${v.id}`, v.of]);
    if (v.kind === "array") {
      for (const p of v.pointers ?? []) exprs.push([`view ${v.id} pointer`, p]);
      if (v.range) exprs.push([`view ${v.id} range`, v.range.from], [`view ${v.id} range`, v.range.to]);
    }
    if (v.kind === "vars" || v.kind === "call-stack") for (const e of v.show) exprs.push([`view ${v.id}`, e]);
    if (v.kind === "tree") {
      exprs.push([`view ${v.id} root`, v.root], [`view ${v.id} current`, v.current]);
      if (v.waiting) exprs.push([`view ${v.id} waiting`, v.waiting]);
    }
  }
  for (const [line, ls] of Object.entries(spec.lines)) {
    const n = Number(line);
    if (!(n >= 1 && n <= lineCount)) problems.push({ where: `line ${line}`, message: `the solution has only ${lineCount} lines` });
    if (ls.focus && !ids.has(ls.focus.view)) problems.push({ where: `line ${line} focus`, message: `no view called ${ls.focus.view}` });
    for (const nar of ls.narrate ?? []) if (nar.when) exprs.push([`line ${line} when`, nar.when]);
  }
  for (const [where, e] of exprs) {
    try { parse(e); } catch (err) { problems.push({ where, message: (err as Error).message }); }
  }

  // Every view must find its data at some point in each trace.
  for (const [t, trace] of traces.entries()) {
    for (const v of spec.views) {
      if (!requireViews || !("of" in v)) continue;
      const found = trace.steps.some((s) => {
        try { evaluate(v.of, { locals: s.frames.at(-1)!.locals, heap: s.heap }); return true; } catch { return false; }
      });
      if (!found) problems.push({ where: `view ${v.id} (trace ${t + 1})`, message: `"${v.of}" never exists in this trace` });
    }

    // Narration and focus must work on every moment where their line runs.
    for (const m of buildMoments(trace)) {
      if (!m.executed) continue;
      const ls = spec.lines[m.executed.line];
      if (!ls) continue;
      const scope = scopeAt(m, trace.steps[m.stepIndex]);
      try {
        narrate(ls.narrate, scope);
        if (ls.focus?.key) evaluate(ls.focus.key, scope);
        if (ls.focus?.index) evaluate(ls.focus.index, scope);
      } catch (err) {
        if (!(err instanceof ExprError)) throw err;
        problems.push({ where: `line ${m.executed.line}, moment ${m.index} (trace ${t + 1})`, message: err.message });
      }
    }
  }
  return problems;
}
