// Explaining a problem that isn't in the library yet, end to end:
//   identify   what was typed → a brief (problem, signature, inputs, examples with answers)
//   draft      a separate call writes the solutions, specs and lesson
//   check      the five deterministic checks in the sandbox; failures go back for repair
//   film       the example traced and growth measured (in the sandbox), cached on disk
// Every stage is reported as it happens. The result is served to everyone after that, instantly.
// Generated lessons are marked as checked automatically but not reviewed by a person.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Sandbox } from "../engine/sandbox/sandbox";
import type { Trace } from "../engine/tracer/types";
import { type Brief, type LibraryEntry, toProblem } from "../src/content/draft";
import { measureLesson } from "../src/content/measure";
import { PROBLEMS } from "../src/content/problems";
import type { Measured } from "../src/content/validateLesson";
import { type DraftModel, draftLesson } from "../pipeline/drafter";
import { type IdentifyModel, toBrief } from "../pipeline/identify";

export interface Explained { entry: LibraryEntry; traces: Record<string, Trace>; growth: Measured }

// The events the browser understands (src/lib/remote.ts), shared so the two can't drift apart.
import type { ExplainEvent } from "../src/lib/remote";
export type { ExplainEvent };

interface Options {
  identifier: IdentifyModel;
  drafter: DraftModel;
  sandbox: Sandbox;
  cacheDir: string;
  /** The drafter's system prompt (stable, cached by the API). */
  system: string;
  attempts?: number;
}

export class Explainer {
  private inFlight = new Map<string, Promise<string>>();
  private queries: Record<string, string>;

  constructor(private readonly o: Options) {
    mkdirSync(o.cacheDir, { recursive: true });
    this.queries = this.readJson("queries.json") ?? {};
  }

  /** A generated problem from the cache, or null. */
  get(slug: string): Explained | null {
    return /^[a-z0-9-]+$/.test(slug) ? this.readJson(`${slug}.json`) : null;
  }

  /** Explain whatever was typed. Resolves to the slug of a film that's ready to watch. */
  async explain(query: string, emit: (e: ExplainEvent) => void): Promise<string | null> {
    const key = normalize(query);
    try {
      // Asked before: skip straight to the answer.
      const known = this.queries[key];
      if (known && (this.isBuiltIn(known) || this.get(known))) return this.ready(known, emit);

      emit({ type: "status", stage: "identify", message: "Reading the problem…" });
      const id = await this.o.identifier.identify(query);
      if (!id.found || !id.brief) { emit({ type: "error", message: id.reason || "That doesn't look like a LeetCode problem Pillow can explain yet." }); return null; }
      const brief = toBrief(id.brief);
      emit({ type: "problem", title: brief.title, number: brief.leetcode.number, statement: brief.statement });
      this.remember(key, brief.slug);
      if (this.isBuiltIn(brief.slug) || this.get(brief.slug)) return this.ready(brief.slug, emit);

      // One generation per problem at a time; later askers wait for the same one.
      let job = this.inFlight.get(brief.slug);
      if (!job) {
        job = this.generate(brief, emit).finally(() => this.inFlight.delete(brief.slug));
        this.inFlight.set(brief.slug, job);
      } else emit({ type: "status", stage: "draft", message: "Someone else asked for this one a moment ago. Joining their film…" });
      return this.ready(await job, emit);
    } catch (e) {
      emit({ type: "error", message: friendly(e) });
      return null;
    }
  }

  private async generate(brief: Brief, emit: (e: ExplainEvent) => void): Promise<string> {
    const { sandbox } = this.o;
    emit({ type: "status", stage: "draft", message: "Writing the obvious idea, then the better one…" });
    const result = await draftLesson(brief, this.o.drafter, this.o.system, sandbox, {
      attempts: this.o.attempts ?? 3,
      onAttempt: (n, a) => {
        if (a.report.ok) emit({ type: "status", stage: "check", message: "Every check passed." });
        else {
          const failed = a.report.checks.filter((c) => !c.ok).map((c) => c.name).join(", ");
          emit({ type: "status", stage: "check", message: `Attempt ${n} didn't pass (${failed}). Fixing it…` });
        }
      },
    });
    if (!result.ok || !result.draft) throw new UserError("Pillow couldn't produce a film for this one that passes its checks. It's been noted; try another problem.");

    emit({ type: "status", stage: "film", message: "Running both solutions to film them…" });
    const report = result.attempts.at(-1)!.report;
    const entry: LibraryEntry = {
      brief,
      draft: result.draft,
      growthInputs: report.growthInputs!,
      provenance: { model: this.o.drafter.id, attempts: result.attempts.length },
    };
    const problem = toProblem(brief, result.draft, entry.growthInputs);
    const sources = new Map(problem.approaches.map((a, i) => [a.solution, result.draft!.approaches[i].solution]));
    const traces: Record<string, Trace> = {};
    for (const a of problem.approaches) traces[a.id] = await sandbox.trace({ source: sources.get(a.solution)!, entry: a.entry, args: problem.example, maxSteps: 20_000 });
    const growth = await measureLesson(problem, (name) => sources.get(name)!, (req) => sandbox.trace(req));

    this.writeJson(`${brief.slug}.json`, { entry, traces, growth } satisfies Explained);
    return brief.slug;
  }

  private ready(slug: string, emit: (e: ExplainEvent) => void): string {
    emit({ type: "ready", slug, builtIn: this.isBuiltIn(slug) });
    return slug;
  }

  private isBuiltIn(slug: string) { return PROBLEMS.some((p) => p.slug === slug); }

  private remember(key: string, slug: string) {
    this.queries[key] = slug;
    this.writeJson("queries.json", this.queries);
  }

  private readJson<T>(name: string): T | null {
    const file = join(this.o.cacheDir, name);
    try { return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : null; } catch { return null; }
  }

  private writeJson(name: string, value: unknown) {
    const file = join(this.o.cacheDir, name);
    writeFileSync(`${file}.tmp`, JSON.stringify(value));
    renameSync(`${file}.tmp`, file); // never leave a half-written file for a reader
  }
}

class UserError extends Error {}

export const normalize = (q: string) => q.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 500);

function friendly(e: unknown): string {
  if (e instanceof UserError) return e.message;
  const msg = (e as Error)?.message ?? String(e);
  if (/authentication|api key|credentials/i.test(msg)) return "Pillow's server isn't set up to explain new problems yet (no API key).";
  if (/rate limit|overloaded|529|429/i.test(msg)) return "Pillow is busy right now. Try again in a minute.";
  return "Something went wrong while explaining this problem. Try again.";
}
