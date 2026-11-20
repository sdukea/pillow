import { describe, expect, it } from "vitest";
import { prepare } from "../../engine/interpreter/viewmodel";
import { fixtureSource, traceCPython } from "../../engine/testing/trace";
import { PROBLEMS } from "../content/problems";
import { simplified } from "../learn/pace";
import { CONCEPTS, conceptById, depthOf } from "./concepts";
import { MISCONCEPTIONS, misconceptionById } from "./misconceptions";
import type { Evidence } from "./evidence";
import { assess } from "./model";
import { complexityFor, predictionFor, recallFor } from "./questions";
import { recommend } from "./recommend";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const ev = (over: Partial<Evidence>): Evidence => ({ at: 0, task: "predict", problem: "two-sum", concepts: ["hash-map"], detail: "x", ...over });

describe("concepts", () => {
  it("every prerequisite exists, and there are no cycles", () => {
    for (const c of CONCEPTS) {
      for (const r of c.requires) expect(conceptById.has(r), `${c.id} → ${r}`).toBe(true);
      expect(() => depthOf(c.id)).not.toThrow();
    }
  });
  it("every lesson approach is tagged with real concepts", () => {
    for (const p of PROBLEMS.filter((x) => x.lesson)) {
      for (const a of p.approaches) {
        const tags = p.lesson!.approaches[a.id].concepts;
        expect(tags.length, `${p.slug}/${a.id}`).toBeGreaterThan(0);
        for (const t of tags) expect(conceptById.has(t)).toBe(true);
      }
    }
  });
});

describe("the student model", () => {
  const state = (log: Evidence[], now = 10 * DAY) => assess(log, now).get("hash-map")!;

  it("never counts watching as understanding", () => {
    expect(state([]).state).toBe("unseen");
    expect(state([ev({ task: "exposure", correct: undefined }), ev({ task: "exposure", correct: undefined })]).state).toBe("seen");
  });
  it("needs two right answers without hints, from different tasks or problems", () => {
    expect(state([ev({ correct: true })]).state).toBe("learning");
    expect(state([ev({ correct: true, at: 1 }), ev({ correct: true, at: 9 * HOUR })]).state).toBe("learning"); // same task and problem twice
    expect(state([ev({ correct: true, at: 1, hinted: true }), ev({ task: "complexity", correct: true, at: 9 * HOUR })]).state).toBe("learning");
  });
  it("doesn't count answers given moments apart in one sitting: it needs retention or transfer", () => {
    const sameSitting = [ev({ correct: true, at: 0 }), ev({ task: "complexity", correct: true, at: 60_000 })];
    expect(state(sameSitting).state).toBe("learning");
    expect(state(sameSitting).why).toMatch(/later session|another problem/);
    // Retention: right again in a later session.
    expect(state([...sameSitting, ev({ task: "recall", correct: true, at: 9 * HOUR })], 9 * HOUR).state).toBe("understood");
    // Transfer: right in a different problem.
    expect(state([...sameSitting, ev({ problem: "valid-parentheses", correct: true, at: 120_000 })], 120_000).state).toBe("understood");
  });
  it("is shaky when the latest answer was wrong, and explains why", () => {
    const s = state([ev({ correct: true, at: 1 }), ev({ task: "complexity", correct: true, at: 9 * HOUR }), ev({ task: "recall", correct: false, at: 10 * HOUR, detail: "picked the wrong trick" })]);
    expect(s.state).toBe("shaky");
    expect(s.why).toContain("picked the wrong trick");
  });
  it("brings understood concepts back on a spaced schedule", () => {
    const log = [ev({ correct: true, at: 0 }), ev({ task: "complexity", correct: true, at: 9 * HOUR })];
    expect(state(log, 9 * HOUR + DAY / 2).due).toBe(false);
    expect(state(log, 9 * HOUR + DAY + 1).due).toBe(true);
    const longer = [...log, ev({ task: "recall", correct: true, at: 2 * DAY })];
    expect(state(longer, 2 * DAY + DAY + 1).due).toBe(false); // the next interval is 2 days
    expect(state(longer, 2 * DAY + 2 * DAY + 1).due).toBe(true);
  });
});

describe("misconceptions", () => {
  it("are all tied to real concepts, and every lesson's wrong answers name real ones", () => {
    for (const m of MISCONCEPTIONS) expect(conceptById.has(m.concept), m.id).toBe(true);
    for (const p of PROBLEMS.filter((x) => x.lesson)) {
      for (const step of p.lesson!.reasoning) {
        expect(step.choices.filter((c) => c.correct)).toHaveLength(1);
        for (const c of step.choices) if (c.misconception) expect(misconceptionById.has(c.misconception)).toBe(true);
      }
    }
  });
  it("a wrong answer that reveals one makes the concept shaky, in the student's own terms", () => {
    const s = assess([ev({ task: "reason", concepts: ["hash-lookup"], correct: false, misconception: "lookup-scans", at: 5 })]).get("hash-lookup")!;
    expect(s.state).toBe("shaky");
    expect(s.why).toBe("You seemed to think looking something up in a hash map means scanning every key.");
    expect(s.misconceptions.map((m) => m.id)).toEqual(["lookup-scans"]);
  });
  it("stands until a clean right answer clears it", () => {
    const wrong = ev({ task: "reason", concepts: ["hash-lookup"], correct: false, misconception: "lookup-scans", at: 5 });
    const hinted = ev({ task: "predict", concepts: ["hash-lookup"], correct: true, hinted: true, at: 6 });
    expect(assess([wrong, hinted]).get("hash-lookup")!.misconceptions).toHaveLength(1);
    const clean = ev({ task: "predict", concepts: ["hash-lookup"], correct: true, at: 7 });
    expect(assess([wrong, hinted, clean]).get("hash-lookup")!.misconceptions).toHaveLength(0);
  });
  it("recommendations name the misconception as the reason to fix it", () => {
    const recs = recommend(PROBLEMS, assess([ev({ task: "reason", problem: "two-sum", concepts: ["hash-lookup"], correct: false, misconception: "lookup-scans" })]));
    expect(recs[0]).toMatchObject({ kind: "fix", concept: "hash-lookup" });
    expect(recs[0].reason).toMatch(/You seemed to think looking something up/);
  });
});

describe("questions generated from real traces", () => {
  for (const p of PROBLEMS.filter((x) => x.lesson)) {
    for (const a of p.approaches) {
      it(`${p.slug} / ${a.name}: a prediction whose answer is what the code actually did`, () => {
        const trace = traceCPython({ source: fixtureSource(a.solution), entry: a.entry, args: p.example });
        const prepared = prepare(trace, simplified(a.spec));
        const q = predictionFor(prepared);
        expect(q, "a question exists").not.toBeNull();
        const labels = q!.choices.map((c) => c.label);
        expect(new Set(labels).size).toBe(labels.length);
        expect(q!.choices.filter((c) => c.correct)).toHaveLength(1);
        expect(q!.moment).toBeLessThan(q!.reveal);
        // The right answer is on screen at the reveal moment.
        const shown = JSON.stringify(prepared.view(q!.reveal).views);
        const right = q!.choices.find((c) => c.correct)!.label;
        const token = right.match(/\((.*)\)$/)?.[1] ?? right.replace(/^node /, "");
        if (right !== "empty" && right !== "None") expect(shown).toContain(token);
      });
    }
    it(`${p.slug}: complexity questions match the measured class, and recall offers its own trick`, () => {
      for (const a of p.approaches) {
        const q = complexityFor(p, a.id)!;
        expect(q.truth).toBe(p.lesson!.approaches[a.id].complexity.time);
        expect(q.choices.filter((c) => c.correct)).toHaveLength(1);
      }
      const r = recallFor(p, PROBLEMS, 3)!;
      expect(r.choices.find((c) => c.correct)!.label).toBe(p.lesson!.card.trick);
      expect(r.choices).toHaveLength(3);
    });
  }
});

describe("recommendations", () => {
  it("starts a new student on problems with no unmet prerequisites", () => {
    const recs = recommend(PROBLEMS, assess([]));
    expect(recs[0].kind).toBe("learn");
    expect(recs.length).toBeGreaterThan(0);
  });
  it("puts a missed concept first, with the problem that tested it", () => {
    const log = [ev({ problem: "valid-parentheses", concepts: ["stack"], correct: false, detail: "predicted the wrong top" })];
    const recs = recommend(PROBLEMS, assess(log));
    expect(recs[0]).toMatchObject({ kind: "fix", concept: "stack" });
    expect(recs[0].problem.slug).toBe("valid-parentheses");
  });
  it("brings back an understood concept when its review is due", () => {
    const log = [ev({ concepts: ["stack"], problem: "valid-parentheses", correct: true, at: 0 }), ev({ task: "recall", concepts: ["stack"], problem: "valid-parentheses", correct: true, at: 9 * HOUR })];
    const recs = recommend(PROBLEMS, assess(log, 5 * DAY));
    expect(recs.some((r) => r.kind === "review" && r.concept === "stack")).toBe(true);
  });
});
