// The JSON formats behind AI-assisted lessons, and their conversion into an ordinary Problem.
//
// - A Brief is written by a person: the problem, its signature, its input fields, and examples
//   with expected outputs. The expected outputs are the ground truth drafts are tested against.
// - A Draft is what the model writes: solutions, visualization specs and lesson text, in a
//   JSON-friendly shape (arrays where the app uses records, values where the app uses Args).
// - A LibraryEntry is a draft that passed every check and a human review, as committed.
//
// No AI output reaches a learner without going through toProblem, the build's validation, and a
// named reviewer. This file has no dependencies beyond the app's own types, so the app can load
// library entries directly.

import type { GrowthClass } from "../../engine/analysis/growth";
import type { LineTag, ViewSpec, VizSpec } from "../../engine/interpreter/spec";
import type { Arg } from "../../engine/tracer/types";
import type { InputField } from "./inputs";
import type { Check, Lesson, LineNote } from "./lesson";
import type { Pattern, Problem, Provenance } from "./problems";

export interface Brief {
  slug: string;
  title: string;
  leetcode: { number: number; slug: string };
  pattern: Pattern;
  /** The problem in the author's own words. The draft rewrites it in Pillow's plain style. */
  statement: string;
  /** The function name every solution must define. */
  entry: string;
  inputs: InputField[];
  /** Plain values, one per input field, and the output a correct solution returns. */
  examples: { values: unknown[]; expected: unknown }[];
  /**
   * What LeetCode guarantees about valid inputs, as Python defining valid(...) with one parameter
   * per field, e.g. "exactly one pair adds up to target". Random test inputs must satisfy it.
   */
  precondition?: string;
  /** Optional guidance for the drafter, e.g. which first approach to teach. */
  guidance?: string;
}

export interface DraftApproach {
  /** kebab-case, e.g. "brute-force". */
  id: string;
  name: string;
  /** Python source defining the brief's entry function. */
  solution: string;
  spec: {
    views: ViewSpec[];
    lines: { line: number; tag?: LineTag; narrate: { when?: string; text: string }[]; focus?: { view: string; key?: string; index?: string } }[];
  };
  headline: string;
  intuition: string;
  discovery: string;
  steps: string[];
  insight?: { inefficiency: string; repeatedWork: string; observation: string; technique: string; whyItWorks: string; tradeoffs: string };
  notes: ({ line: number } & LineNote)[];
  complexity: { time: GrowthClass; space: GrowthClass; timeLabel?: string; spaceLabel?: string; counted: string; timeWhy: string; spaceWhy: string };
  whyNotEnough?: string;
  check?: Check;
}

export interface Draft {
  /** One line, shown on Home. */
  summary: string;
  /** The example every approach plays: a JSON array with one value per input field. */
  example: { values: string; label: string };
  understand: Lesson["understand"];
  approaches: DraftApproach[];
  compare: Lesson["compare"];
  growth: {
    sizes: number[];
    spaceSizes: number[];
    describe: string;
    /** Python source defining make_input(n), returning a list with one value per input field. */
    generator: string;
  };
  /** Each a JSON array with one value per input field. */
  edgeCases: string[];
}

export interface LibraryEntry {
  brief: Brief;
  draft: Draft;
  /** The generator's output, computed in the sandbox at promotion: size → one value per field. */
  growthInputs: Record<string, unknown[]>;
  provenance: Provenance;
}

// ------------------------------------------------------------------ conversion

/** Plain values (one per field) to tracer args. */
export function valuesToArgs(fields: InputField[], values: unknown[]): Arg[] {
  if (!Array.isArray(values) || values.length !== fields.length) {
    throw new Error(`expected ${fields.length} value(s) (${fields.map((f) => f.name).join(", ")}), got ${JSON.stringify(values)}`);
  }
  return fields.map((f, i) => {
    const v = values[i];
    if (f.type === "linked-list") return { kind: "linked_list", values: v as unknown[] };
    if (f.type === "tree") return { kind: "tree", values: v as unknown[] };
    return { kind: "value", value: v };
  });
}

export function parseValues(fields: InputField[], json: string): Arg[] {
  let values: unknown;
  try { values = JSON.parse(json); } catch { throw new Error(`not valid JSON: ${json}`); }
  return valuesToArgs(fields, values as unknown[]);
}

/** The fixture name a promoted approach's solution is saved under. */
export const solutionName = (slug: string, approachId: string) => `${slug}--${approachId}`.replace(/-/g, "_");

/**
 * Build an ordinary Problem from a brief and a draft. `growthInputs` maps each size to the
 * generator's output (computed in the sandbox, never in the app).
 */
export function toProblem(brief: Brief, draft: Draft, growthInputs: Record<string, unknown[]>, provenance?: Problem["provenance"]): Problem {
  const approaches = draft.approaches.map((a) => ({
    id: a.id,
    name: a.name,
    solution: solutionName(brief.slug, a.id),
    entry: brief.entry,
    spec: {
      views: a.spec.views,
      lines: Object.fromEntries(a.spec.lines.map(({ line, ...rest }) => [line, rest])),
    } satisfies VizSpec,
  }));
  const lesson: Lesson = {
    understand: draft.understand,
    approaches: Object.fromEntries(draft.approaches.map((a) => [a.id, {
      headline: a.headline,
      intuition: a.intuition,
      discovery: a.discovery,
      steps: a.steps,
      insight: a.insight,
      notes: Object.fromEntries(a.notes.map(({ line, ...note }) => [line, note])),
      complexity: a.complexity,
      whyNotEnough: a.whyNotEnough,
      check: a.check,
    }])),
    compare: draft.compare,
    growth: {
      sizes: draft.growth.sizes,
      spaceSizes: draft.growth.spaceSizes,
      describe: draft.growth.describe,
      input: (n) => {
        const values = growthInputs[String(n)];
        if (!values) throw new Error(`no growth input for n = ${n}`);
        return valuesToArgs(brief.inputs, values);
      },
    },
    edgeCases: draft.edgeCases.map((json) => parseValues(brief.inputs, json)),
  };
  return {
    slug: brief.slug,
    title: brief.title,
    leetcode: brief.leetcode,
    pattern: brief.pattern,
    summary: draft.summary,
    example: parseValues(brief.inputs, draft.example.values),
    exampleLabel: draft.example.label,
    approaches,
    inputs: brief.inputs,
    precondition: brief.precondition,
    lesson,
    provenance,
  };
}

export function fromLibrary(entry: LibraryEntry): Problem {
  return toProblem(entry.brief, entry.draft, entry.growthInputs, entry.provenance);
}
