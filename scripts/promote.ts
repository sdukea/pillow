// Publish a draft that passed every check, after a person has reviewed it.
//
//   npm run promote -- <slug> --reviewer "Your Name"
//
// Re-runs the full validation in the sandbox (the draft on disk may have been edited during
// review), then writes the solutions as fixtures and the lesson as a library entry. From then on
// the normal build validates it like any hand-written lesson, with CPython.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Sandbox } from "../engine/sandbox/sandbox";
import { type LibraryEntry, solutionName } from "../src/content/draft";
import { DraftSchema, BriefSchema } from "../pipeline/schema";
import { writeLibraryIndex } from "../pipeline/library";
import { reportMarkdown, validateDraft } from "../pipeline/validate";

const ROOT = join(import.meta.dirname, "..");
const args = process.argv.slice(2);
const slug = args[0];
const reviewer = args.includes("--reviewer") ? args[args.indexOf("--reviewer") + 1] : undefined;
if (!slug || !reviewer?.trim()) {
  console.error('Usage: npm run promote -- <slug> --reviewer "Your Name"\nA named reviewer is required: no AI draft is published without one.');
  process.exit(2);
}

const draftDir = join(ROOT, "content", "drafts", slug);
const brief = BriefSchema.parse(JSON.parse(readFileSync(join(ROOT, "content", "briefs", `${slug}.json`), "utf8")));
const draft = DraftSchema.parse(JSON.parse(readFileSync(join(draftDir, "draft.json"), "utf8")));
const status = existsSync(join(draftDir, "status.json")) ? JSON.parse(readFileSync(join(draftDir, "status.json"), "utf8")) : { model: "unknown", attempts: 0 };

const sandbox = new Sandbox();
const report = await validateDraft(brief, draft, sandbox);
sandbox.close();
writeFileSync(join(draftDir, "report.md"), reportMarkdown(brief, report, status.attempts));
if (!report.ok || !report.growthInputs) {
  console.error(`✗ ${brief.title} doesn't pass every check, so it can't be published. See content/drafts/${slug}/report.md.`);
  process.exit(1);
}

for (const a of draft.approaches) {
  writeFileSync(join(ROOT, "engine", "tracer", "fixtures", `${solutionName(slug, a.id)}.py`), a.solution.trimEnd() + "\n");
}
const entry: LibraryEntry = {
  brief,
  draft,
  growthInputs: report.growthInputs,
  provenance: { model: status.model, attempts: status.attempts, reviewer: reviewer.trim(), reviewedOn: new Date().toISOString().slice(0, 10) },
};
const libDir = join(ROOT, "src", "content", "library");
writeFileSync(join(libDir, `${slug}.json`), JSON.stringify(entry, null, 1) + "\n");
writeLibraryIndex(libDir);

console.log(`✓ Published ${brief.title}, reviewed by ${entry.provenance.reviewer}.
  Next: npm run traces && npm test, then commit src/content/library/${slug}.json and the new fixtures.`);
