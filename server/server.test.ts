// Explaining a new problem end to end, with scripted models standing in for Claude: the stages are
// reported in order, the film's data is checked and cached, a second ask is instant, and the HTTP
// server streams it all as Server-Sent Events.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Sandbox, sandboxSupported } from "../engine/sandbox/sandbox";
import { fixtureSource, traceCPython } from "../engine/testing/trace";
import type { Brief, Draft } from "../src/content/draft";
import { PROBLEMS } from "../src/content/problems";
import type { DraftModel } from "../pipeline/drafter";
import { problemToBrief, problemToDraft } from "../pipeline/fromProblem";
import type { IdentifyModel } from "../pipeline/identify";
import { type ExplainEvent, Explainer } from "./explain";
import { startServer } from "./index";

const two = PROBLEMS.find((p) => p.slug === "two-sum")!;

/** A scripted identifier: answers with this brief (examples as JSON strings, like the real model). */
function identifierFor(brief: Brief): IdentifyModel & { calls: number } {
  return {
    id: "scripted", calls: 0,
    async identify() {
      this.calls++;
      return { found: true, reason: "", brief: { ...brief, examples: brief.examples.map((e) => ({ values: JSON.stringify(e.values), expected: JSON.stringify(e.expected) })) } };
    },
  };
}
function drafterFor(draft: Draft): DraftModel & { calls: number } {
  return { id: "scripted", calls: 0, async complete() { this.calls++; return { draft, content: [{ type: "text", text: "{}", citations: null }] }; } };
}

describe.skipIf(!sandboxSupported())("explaining a new problem", () => {
  let sandbox: Sandbox, dir: string, brief: Brief, draft: Draft;
  beforeAll(async () => {
    sandbox = new Sandbox(15_000);
    dir = mkdtempSync(join(tmpdir(), "pillow-explain-"));
    // A problem the app doesn't have built in: Two Sum under another slug.
    brief = { ...(await problemToBrief(two, fixtureSource, traceCPython)), slug: "two-sum-again", title: "Two Sum Again" };
    draft = problemToDraft(two, fixtureSource);
  }, 60_000);
  afterAll(() => { sandbox.close(); rmSync(dir, { recursive: true, force: true }); });

  it("reports each stage, checks and films the lesson, caches it, and answers instantly the second time", async () => {
    const identifier = identifierFor(brief), drafter = drafterFor(draft);
    const explainer = new Explainer({ identifier, drafter, sandbox, cacheDir: dir, system: "system" });
    const events: ExplainEvent[] = [];
    const slug = await explainer.explain("two sum again", (e) => events.push(e));
    expect(slug).toBe("two-sum-again");
    expect(events.map((e) => (e.type === "status" ? e.stage : e.type))).toEqual(["identify", "problem", "draft", "check", "film", "ready"]);
    expect(events.at(-1)).toEqual({ type: "ready", slug: "two-sum-again", builtIn: false });

    const saved = explainer.get("two-sum-again")!;
    expect(saved.entry.provenance).toEqual({ model: "scripted", attempts: 1 }); // no reviewer: generated live
    expect(Object.keys(saved.traces)).toEqual(["brute-force", "hash-map"]);
    expect(saved.traces["hash-map"].ok).toBe(true);
    expect(saved.growth.approaches["brute-force"].steps).toHaveLength(5);

    const again: ExplainEvent[] = [];
    expect(await explainer.explain("  Two  Sum AGAIN ", (e) => again.push(e))).toBe("two-sum-again");
    expect(again).toEqual([{ type: "ready", slug: "two-sum-again", builtIn: false }]);
    expect([identifier.calls, drafter.calls]).toEqual([1, 1]);
  }, 120_000);

  it("sends a problem the app already has straight to its built-in film, without drafting", async () => {
    const drafter = drafterFor(draft);
    const explainer = new Explainer({ identifier: identifierFor({ ...brief, slug: "two-sum" }), drafter, sandbox, cacheDir: dir, system: "system" });
    const events: ExplainEvent[] = [];
    expect(await explainer.explain("the one where two numbers add up to a target", (e) => events.push(e))).toBe("two-sum");
    expect(events.at(-1)).toEqual({ type: "ready", slug: "two-sum", builtIn: true });
    expect(drafter.calls).toBe(0);
  });

  it("explains what went wrong when a draft never passes its checks", async () => {
    const broken = structuredClone(draft);
    broken.approaches[1].solution = "def two_sum(nums, target):\n    return [0, 1]\n";
    const explainer = new Explainer({ identifier: identifierFor({ ...brief, slug: "two-sum-broken" }), drafter: drafterFor(broken), sandbox, cacheDir: dir, system: "system", attempts: 2 });
    const events: ExplainEvent[] = [];
    expect(await explainer.explain("two sum broken", (e) => events.push(e))).toBeNull();
    expect(events.at(-1)).toEqual({ type: "error", message: expect.stringMatching(/couldn't produce a film/) });
    expect(explainer.get("two-sum-broken")).toBeNull();
  }, 120_000);

  it("says plainly when something isn't a problem it can explain", async () => {
    const explainer = new Explainer({
      identifier: { id: "scripted", identify: async () => ({ found: false, reason: "That's a recipe, not a LeetCode problem." }) },
      drafter: drafterFor(draft), sandbox, cacheDir: dir, system: "system",
    });
    const events: ExplainEvent[] = [];
    expect(await explainer.explain("banana bread", (e) => events.push(e))).toBeNull();
    expect(events.at(-1)).toEqual({ type: "error", message: "That's a recipe, not a LeetCode problem." });
  });

  it("serves health, streams explanations, and serves cached films over HTTP", async () => {
    const port = 8790 + Math.floor(Math.random() * 100);
    const api = await startServer({ port, cacheDir: dir, identifier: identifierFor(brief), drafter: drafterFor(draft), canExplain: true });
    try {
      const base = `http://localhost:${port}/api`;
      expect(await (await fetch(`${base}/health`)).json()).toEqual({ ok: true, explain: true });
      const r = await fetch(`${base}/explain`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "two sum again" }) });
      expect(r.headers.get("content-type")).toBe("text/event-stream");
      const events = (await r.text()).split("\n\n").filter((c) => c.startsWith("data: ")).map((c) => JSON.parse(c.slice(6)) as ExplainEvent);
      expect(events.at(-1)).toEqual({ type: "ready", slug: "two-sum-again", builtIn: false });
      const film = await (await fetch(`${base}/problems/two-sum-again`)).json();
      expect(film.entry.brief.title).toBe("Two Sum Again");
      expect((await fetch(`${base}/problems/nope`)).status).toBe(404);
      expect((await fetch(`${base}/problems/..%2Fsecrets`)).status).toBe(404);
      expect((await fetch(`${base}/explain`, { method: "POST", body: JSON.stringify({ query: "" }) })).status).toBe(400);
    } finally { api.close(); }
  }, 120_000);
});
