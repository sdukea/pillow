import { describe, expect, it } from "vitest";
import { ATTRIBUTION, CURRICULUM, introWeek, WEEKS, weekDates } from "./curriculum";
import sources from "./sources.json";
import { CONCEPTS, conceptById, depthOf, type ConceptId } from "../knowledge/concepts";
import { PROBLEMS } from "../content/problems";

describe("the concept ontology", () => {
  it("has unique ids, known prerequisites, no cycles, and a kind for every node", () => {
    const ids = CONCEPTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CONCEPTS) {
      for (const r of c.requires) expect(conceptById.has(r), `${c.id} requires unknown ${r}`).toBe(true);
      expect(() => depthOf(c.id)).not.toThrow();
      expect(["foundation", "structure", "technique"]).toContain(c.kind);
      expect(c.facts.length, `${c.id} needs facts`).toBeGreaterThanOrEqual(2);
      expect(c.useWhen.length).toBeGreaterThan(0);
    }
  });
});

describe("the 16-week plan", () => {
  it("teaches every concept exactly once", () => {
    const taught = WEEKS.flatMap((w) => w.introduces);
    expect(new Set(taught).size).toBe(taught.length);
    expect(new Set(taught)).toEqual(new Set(CONCEPTS.map((c) => c.id)));
  });

  it("never teaches a concept before what it builds on", () => {
    for (const w of WEEKS) for (const c of w.introduces) for (const r of conceptById.get(c)!.requires) {
      expect(introWeek.get(r as ConceptId)!, `${c} (week ${w.week}) needs ${r}`).toBeLessThanOrEqual(w.week);
    }
  });

  it("runs 16 weeks, ending in April 2027", () => {
    expect(WEEKS.map((w) => w.week)).toEqual([...Array(16)].map((_, i) => i + 1));
    const end = weekDates(16).to;
    expect([end.getFullYear(), end.getMonth()]).toEqual([2027, 3]);
  });
});

describe("the curriculum", () => {
  it("covers every source problem once, with slugs as IDs", () => {
    expect(CURRICULUM.length).toBe(sources.problems.length);
    expect(CURRICULUM.length).toBeGreaterThanOrEqual(180);
    expect(CURRICULUM.length).toBeLessThanOrEqual(220);
    expect(new Set(CURRICULUM.map((p) => p.slug)).size).toBe(CURRICULUM.length);
  });

  it("builds each URL from the slug, and never invents a problem number", () => {
    const verified = new Map(PROBLEMS.map((p) => [p.slug, p.leetcode.number]));
    for (const p of CURRICULUM) {
      expect(p.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(p.url).toBe(`https://leetcode.com/problems/${p.slug}/`);
      expect(p.number).toBe(verified.get(p.slug));
    }
  });

  it("includes every built lesson, marked built", () => {
    for (const lesson of PROBLEMS) {
      const p = CURRICULUM.find((c) => c.slug === lesson.slug);
      expect(p, `${lesson.slug} is in no source list`).toBeDefined();
      expect(p!.lesson).toBe("built");
    }
    expect(CURRICULUM.filter((p) => p.lesson === "built")).toHaveLength(PROBLEMS.length);
  });

  it("tags only known concepts, and places each problem after all of them are taught", () => {
    for (const p of CURRICULUM) {
      expect(p.concepts[0]).toBe(p.primary);
      for (const c of [...p.concepts, ...p.prerequisites]) expect(conceptById.has(c), `${p.slug}: ${c}`).toBe(true);
      for (const c of p.concepts) expect(introWeek.get(c)!, `${p.slug}: ${c}`).toBeLessThanOrEqual(p.week);
      for (const c of p.prerequisites) expect(p.concepts).not.toContain(c);
    }
  });

  it("tiers deterministically: Blind 75 or all three lists is core, two lists reinforcement, one stretch", () => {
    for (const p of CURRICULUM) {
      const expected = p.lists.length === 3 || p.lists.includes("blind-75") ? "core" : p.lists.length === 2 ? "reinforcement" : "stretch";
      expect(p.tier, p.slug).toBe(expected);
    }
    expect(CURRICULUM.filter((p) => p.tier === "core")).toHaveLength(75);
  });

  it("gives every teaching week some core problems", () => {
    for (const w of WEEKS.filter((w) => w.introduces.length)) {
      expect(CURRICULUM.some((p) => p.week === w.week && p.tier === "core"), `week ${w.week}`).toBe(true);
    }
  });

  it("is in study order", () => {
    const weeks = CURRICULUM.map((p) => p.week);
    expect(weeks).toEqual([...weeks].sort((a, b) => a - b));
  });

  it("keeps the source's attribution", () => {
    expect(ATTRIBUTION.license).toBe("MIT");
    expect(ATTRIBUTION.notice).toMatch(/^Copyright/);
    expect(ATTRIBUTION.commit).toMatch(/^[0-9a-f]{40}$/);
  });
});
