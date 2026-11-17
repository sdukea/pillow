// Draft a lesson with Claude, behind the validation pipeline. Never publishes.
//
//   npm run draft -- <slug> [--attempts 3]
//
// Reads content/briefs/<slug>.json (written by a person), asks Claude for a draft, validates it in
// the sandbox, sends any failures back for a corrected draft, and writes everything to
// content/drafts/<slug>/. Publishing is a separate, human step: npm run promote.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { Sandbox } from "../engine/sandbox/sandbox";
import { fixtureSource } from "../engine/testing/trace";
import { valuesToArgs } from "../src/content/draft";
import { parseInputs, toText } from "../src/content/inputs";
import { PROBLEMS } from "../src/content/problems";
import { ClaudeDrafter, draftLesson } from "../pipeline/drafter";
import { problemToBrief, problemToDraft } from "../pipeline/fromProblem";
import { systemPrompt } from "../pipeline/prompt";
import { BriefSchema } from "../pipeline/schema";
import { reportMarkdown } from "../pipeline/validate";

const ROOT = join(import.meta.dirname, "..");
const [slug, ...rest] = process.argv.slice(2);
const attempts = Number(rest[rest.indexOf("--attempts") + 1]) || 3;
if (!slug) { console.error("Usage: npm run draft -- <slug> [--attempts 3]"); process.exit(2); }

const brief = BriefSchema.parse(JSON.parse(readFileSync(join(ROOT, "content", "briefs", `${slug}.json`), "utf8")));
if (PROBLEMS.some((p) => p.slug === brief.slug)) { console.error(`${brief.slug} is already in the library.`); process.exit(2); }

// The brief is the ground truth, so check it before spending anything on a draft.
const sandbox = new Sandbox();
for (const [i, ex] of brief.examples.entries()) {
  const args = valuesToArgs(brief.inputs, ex.values);
  const p = parseInputs(brief.inputs, brief.inputs.map((f, k) => toText(f, args[k])));
  if (!p.ok) { console.error(`Brief example ${i + 1}: ${p.field}: ${p.message}`); process.exit(2); }
  if (brief.precondition && (await sandbox.call(brief.precondition, "valid", ex.values)) !== true) {
    console.error(`Brief example ${i + 1} doesn't satisfy the brief's precondition.`); process.exit(2);
  }
}

// The worked example: Two Sum, converted from the hand-written lesson (it passes every check).
const two = PROBLEMS.find((p) => p.slug === "two-sum")!;
const example = { brief: await problemToBrief(two, fixtureSource, (r) => sandbox.trace(r)), draft: problemToDraft(two, fixtureSource) };

const out = join(ROOT, "content", "drafts", brief.slug);
mkdirSync(out, { recursive: true });
const model = new ClaudeDrafter();
console.log(`Drafting ${brief.title} with ${model.id} (up to ${attempts} attempts)…`);

try {
  const result = await draftLesson(brief, model, systemPrompt(example), sandbox, {
    attempts,
    onAttempt: (n, a) => {
      writeFileSync(join(out, `attempt-${n}.json`), JSON.stringify(a.draft, null, 2) + "\n");
      writeFileSync(join(out, `report-${n}.md`), reportMarkdown(brief, a.report, n));
      const failed = a.report.checks.filter((c) => !c.ok).map((c) => c.name);
      console.log(`  attempt ${n}: ${a.report.ok ? "all checks passed" : `failed ${failed.join(", ")}`}${a.usage ? ` (${a.usage})` : ""}`);
    },
  });
  const last = result.attempts.at(-1)!;
  writeFileSync(join(out, "draft.json"), JSON.stringify(last.draft, null, 2) + "\n");
  writeFileSync(join(out, "report.md"), reportMarkdown(brief, last.report, result.attempts.length));
  writeFileSync(join(out, "status.json"), JSON.stringify({ ok: result.ok, model: model.id, attempts: result.attempts.length, usage: result.attempts.map((a) => a.usage) }, null, 2) + "\n");
  if (result.ok) {
    console.log(`\n✓ ${brief.title}: every check passed. Review content/drafts/${brief.slug}/draft.json, then:\n  npm run promote -- ${brief.slug} --reviewer "Your Name"`);
  } else {
    console.log(`\n✗ ${brief.title}: not publishable after ${attempts} attempts. See content/drafts/${brief.slug}/report.md.`);
    process.exitCode = 1;
  }
} catch (e) {
  const noCredentials = e instanceof Anthropic.AuthenticationError || /authentication method/i.test(String((e as Error).message));
  if (noCredentials) console.error("No Anthropic credentials found. Set ANTHROPIC_API_KEY, or run `ant auth login`, then try again.");
  else if (e instanceof Anthropic.RateLimitError) console.error("Rate limited. Try again in a minute.");
  else if (e instanceof Anthropic.APIError) console.error(`API error ${e.status}: ${e.message}`);
  else console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  sandbox.close();
}
