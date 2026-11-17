// The AI content pipeline: the sandbox holds, good lessons pass, every kind of bad draft is caught,
// the repair loop feeds failures back, and a promoted lesson works in the normal build.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Sandbox, sandboxSupported } from "../engine/sandbox/sandbox";
import { fixtureSource, traceCPython } from "../engine/testing/trace";
import { type Brief, type Draft, type DraftApproach, fromLibrary, solutionName } from "../src/content/draft";
import { measureLesson } from "../src/content/measure";
import { PROBLEMS } from "../src/content/problems";
import { validateLesson } from "../src/content/validateLesson";
import { type DraftModel, draftLesson, type Turn } from "./drafter";
import { problemToBrief, problemToDraft } from "./fromProblem";
import { systemPrompt } from "./prompt";
import { type CheckName, type Report, validateDraft } from "./validate";

const problem = (slug: string) => PROBLEMS.find((p) => p.slug === slug)!;
const clone = <T>(x: T): T => structuredClone(x);
const failed = (r: Report) => r.checks.filter((c) => !c.ok).map((c) => c.name);
const problemsOf = (r: Report, name: CheckName) => r.checks.find((c) => c.name === name)?.problems.join("\n") ?? "";

describe.skipIf(!sandboxSupported())("the AI content pipeline", () => {
  let sandbox: Sandbox;
  let brief: Brief;
  let good: Draft;
  beforeAll(async () => {
    sandbox = new Sandbox(10_000);
    const two = problem("two-sum");
    brief = await problemToBrief(two, fixtureSource, traceCPython);
    good = problemToDraft(two, fixtureSource);
  }, 60_000);
  afterAll(() => sandbox.close());

  // ---------------------------------------------------------------- the sandbox
  describe("sandbox", () => {
    const call = (src: string) => sandbox.call(src, "f", []).then((v) => ({ ok: true, v }), (e: Error) => ({ ok: false, v: e.message }));

    it("can't read the host's files", async () => {
      const r = await call(`def f():\n    return open(${JSON.stringify(`${process.cwd()}/package.json`)}).read()\n`);
      expect(r.ok).toBe(false);
      expect(String(r.v)).toMatch(/No such file/);
    });
    it("can't reach JavaScript or Node, even through the garbage collector", async () => {
      expect((await call("def f():\n    import js\n    return 1\n")).ok).toBe(false);
      expect((await call("def f():\n    import pyodide.ffi\n    return 1\n")).ok).toBe(false);
      expect(await call("def f():\n    import gc\n    return [getattr(m, '__name__', '') for m in gc.get_objects() if type(m).__name__ == 'module' and getattr(m, '__name__', '') in ('js', 'pyodide_js')]\n"))
        .toEqual({ ok: true, v: [] });
    });
    it("can't see the environment (no API keys)", async () => {
      expect(await call("def f():\n    import os\n    return [k for k in os.environ if 'KEY' in k or 'TOKEN' in k]\n")).toEqual({ ok: true, v: [] });
    });
    it("can't start processes, and recovers afterwards", async () => {
      expect((await call("def f():\n    import os\n    return os.system('touch /tmp/leetsee-pwned')\n")).ok).toBe(false);
      expect((await call("def f():\n    import subprocess\n    return subprocess.run(['ls']).returncode\n")).ok).toBe(false);
      expect(await call("def f():\n    return 2 + 2\n")).toEqual({ ok: true, v: 4 });
    });
    it("stops a run that never ends, and recovers", async () => {
      const r = await call("def f():\n    while True:\n        pass\n");
      expect(r).toEqual({ ok: false, v: expect.stringMatching(/Timed out/) });
      expect(await call("def f():\n    return 'alive'\n")).toEqual({ ok: true, v: "alive" });
    }, 30_000);
  });

  // ---------------------------------------------------------------- accepting good work
  it("accepts every hand-written lesson, converted to a draft", async () => {
    for (const p of PROBLEMS.filter((x) => x.lesson)) {
      const r = await validateDraft(await problemToBrief(p, fixtureSource, traceCPython), problemToDraft(p, fixtureSource), sandbox);
      expect(failed(r), `${p.slug}: ${r.checks.flatMap((c) => c.problems).join("; ")}`).toEqual([]);
    }
  }, 120_000);

  // ---------------------------------------------------------------- catching bad drafts
  const mutate = (f: (d: Draft) => void) => { const d = clone(good); f(d); return d; };
  const hash = (d: Draft) => d.approaches[1] as DraftApproach;

  it("shape: rejects a draft with the wrong number of approaches or invalid inputs", async () => {
    const r = await validateDraft(brief, mutate((d) => { d.approaches.push(clone(d.approaches[1])); d.example.values = "[[1], 2]"; }), sandbox);
    expect(failed(r)).toEqual(["shape"]);
    expect(problemsOf(r, "shape")).toMatch(/exactly 2 approaches/);
    expect(problemsOf(r, "shape")).toMatch(/at least 2 numbers/);
  });

  it("shape: rejects output that doesn't match the schema", async () => {
    const r = await validateDraft(brief, { summary: 3 }, sandbox);
    expect(failed(r)).toEqual(["shape"]);
  });

  it("shape: runs the growth generator in the sandbox, and rejects one that misbehaves", async () => {
    const r = await validateDraft(brief, mutate((d) => { d.growth.generator = "def make_input(n):\n    import js\n    return [[1, 2], 3]\n"; }), sandbox);
    expect(problemsOf(r, "shape")).toMatch(/make_input\(\d+\).*js/s);
  });

  it("examples: rejects a solution that's wrong on the brief's examples", async () => {
    const r = await validateDraft(brief, mutate((d) => { hash(d).solution = "def two_sum(nums, target):\n    return [0, 1]\n"; }), sandbox);
    expect(problemsOf(r, "examples")).toMatch(/Hash map on .* returned \[0,1\], expected/);
  });

  it("agreement: catches a solution that's only wrong off the examples", async () => {
    const r = await validateDraft(brief, mutate((d) => {
      hash(d).solution = good.approaches[1].solution.replace("    seen = {}\n", "    seen = {}\n    if len(nums) > 9:\n        return []\n");
    }), sandbox);
    expect(failed(r)).toContain("agreement");
    expect(problemsOf(r, "agreement")).toMatch(/the approaches disagree/);
  });

  it("visualization: rejects narration that can't be filled in", async () => {
    const r = await validateDraft(brief, mutate((d) => { hash(d).spec.lines[0].narrate = [{ text: "Now {nope + 1}" }]; }), sandbox);
    expect(problemsOf(r, "visualization")).toMatch(/nope/);
  });

  it("lesson: rejects an unexplained line and a complexity claim that doesn't match measurement", async () => {
    const r = await validateDraft(brief, mutate((d) => {
      hash(d).notes = hash(d).notes.filter((n) => n.line !== 4);
      d.approaches[0].complexity.time = "n";
    }), sandbox);
    expect(problemsOf(r, "lesson")).toMatch(/line 4 runs but has no explanation/);
    expect(problemsOf(r, "lesson")).toMatch(/claims O\(n\) time, but measured growth looks like O\(n²\)/);
  });

  it("examples: a solution that never returns times out instead of hanging the pipeline", async () => {
    const r = await validateDraft(brief, mutate((d) => { hash(d).solution = "def two_sum(nums, target):\n    while True:\n        pass\n"; }), sandbox);
    expect(problemsOf(r, "examples")).toMatch(/step limit|Timed out/);
  }, 120_000);

  // ---------------------------------------------------------------- the repair loop
  /** A model that replies with scripted drafts, recording what it was sent. */
  function scripted(...drafts: unknown[]): DraftModel & { seen: Turn[][] } {
    const seen: Turn[][] = [];
    return {
      id: "scripted",
      seen,
      async complete(_system, turns) {
        seen.push(structuredClone(turns));
        const draft = drafts.shift() ?? null;
        return { draft, content: [{ type: "text", text: JSON.stringify(draft), citations: null }] };
      },
    };
  }

  it("sends failures back and accepts the corrected draft", async () => {
    const broken = mutate((d) => { hash(d).notes = hash(d).notes.filter((n) => n.line !== 4); });
    const model = scripted(broken, good);
    const result = await draftLesson(brief, model, "system", sandbox, { attempts: 3 });
    expect(result.ok).toBe(true);
    expect(result.attempts).toHaveLength(2);
    const second = model.seen[1];
    expect(second.map((t) => t.role)).toEqual(["user", "assistant", "user"]); // append-only
    expect(String(second[2].content)).toMatch(/line 4 runs but has no explanation/);
  }, 60_000);

  it("gives up after the attempt limit, and never treats an unparseable reply as a draft", async () => {
    const result = await draftLesson(brief, scripted(null, { summary: "x" }), "system", sandbox, { attempts: 2 });
    expect(result.ok).toBe(false);
    expect(result.attempts.map((a) => failed(a.report))).toEqual([["shape"], ["shape"]]);
    expect(result.draft).toBeUndefined();
  }, 30_000);

  it("the system prompt carries the formats and a worked example that passes every check", () => {
    const prompt = systemPrompt({ brief, draft: good });
    expect(prompt).toContain("export type ViewSpec");
    expect(prompt).toContain(good.approaches[1].solution.split("\n")[1]);
  });

  // ---------------------------------------------------------------- promotion
  it("a promoted lesson loads from the library and passes the normal build's checks", async () => {
    const two = problem("two-sum");
    const report = await validateDraft(brief, good, sandbox);
    expect(report.ok).toBe(true);
    const promoted = fromLibrary({ brief: { ...brief, slug: "two-sum-promoted" }, draft: good, growthInputs: report.growthInputs!, provenance: { model: "test", attempts: 1, reviewer: "Test Reviewer", reviewedOn: "2026-11-17" } });
    expect(promoted.approaches.map((a) => a.solution)).toEqual(["two_sum_promoted__brute_force", "two_sum_promoted__hash_map"].map((s) => s));
    expect(solutionName("two-sum-promoted", "hash-map")).toBe("two_sum_promoted__hash_map");
    // The build reads promoted solutions from fixtures; here, map them to the originals.
    const byName = new Map(promoted.approaches.map((a, i) => [a.solution, two.approaches[i].solution]));
    const measured = await measureLesson(promoted, (name) => fixtureSource(byName.get(name)!), traceCPython);
    expect(validateLesson(promoted, measured)).toEqual([]);
    expect(promoted.provenance?.reviewer).toBe("Test Reviewer");
  }, 60_000);
});
