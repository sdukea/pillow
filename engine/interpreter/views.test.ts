import { describe, expect, it } from "vitest";
import { fixtureSource, traceFixture, value } from "../testing/trace";
import * as specs from "./fixtures/specs";
import type { VizSpec } from "./spec";
import { validateSpec } from "./validate";
import { prepare, type ViewModel } from "./viewmodel";

const paths = () => traceFixture("unique_paths", "unique_paths", [value(3), value(4)]);
const kth = () => traceFixture("kth_largest_heap", "find_kth_largest", [value([3, 2, 1, 5, 6, 4]), value(2)]);
const courses = (n = 4, pre = [[1, 0], [2, 0], [3, 1], [3, 2]]) => traceFixture("course_schedule", "can_finish", [value(n), value(pre)]);
const redundant = () => traceFixture("redundant_connection", "find_redundant_connection", [value([[1, 2], [1, 3], [2, 3]])]);

type Of<K extends ViewModel["kind"]> = Extract<ViewModel, { kind: K }>;
const views = (spec: VizSpec, trace: ReturnType<typeof paths>) => {
  const p = prepare(trace, spec);
  return p.moments.map((_, i) => p.view(i));
};
const find = <K extends ViewModel["kind"]>(vs: ViewModel[], id: string) => vs.find((v) => v.id === id) as Of<K>;

describe("the new views' specs", () => {
  it("validate against real traces, narration included, on every moment", () => {
    const cases: [string, VizSpec, ReturnType<typeof paths>[]][] = [
      ["unique_paths", specs.uniquePaths, [paths(), traceFixture("unique_paths", "unique_paths", [value(1), value(1)])]],
      ["kth_largest_heap", specs.kthLargestHeap, [kth(), traceFixture("kth_largest_heap", "find_kth_largest", [value([1]), value(1)])]],
      ["course_schedule", specs.courseSchedule, [courses(), courses(2, [[0, 1], [1, 0]])]],
      ["redundant_connection", specs.redundantConnection, [redundant()]],
    ];
    for (const [fixture, spec, traces] of cases) {
      for (const t of traces) expect(t.ok, fixture).toBe(true);
      expect(validateSpec(spec, fixtureSource(fixture), traces), fixture).toEqual([]);
    }
  });
});

describe("grid (DP table)", () => {
  it("shows the table filling in, the cell being filled, and the two cells it's built from", () => {
    const all = views(specs.uniquePaths, paths());
    const final = find<"grid">(all.at(-1)!.views, "dp");
    expect(final.rows.map((r) => r.map((c) => c.text))).toEqual([["1", "1", "1", "1"], ["1", "2", "3", "4"], ["1", "3", "6", "10"]]);
    const fill = all.find((m) => m.ranLine === 5)!;
    const g = find<"grid">(fill.views, "dp");
    expect(g.rows[1][1]).toMatchObject({ text: "2", state: "updated", pointers: ["here"] });
    expect(g.rows[0][1].focused).toBe(true);
    expect(g.rows[1][0].focused).toBe(true);
    expect(g.rows.flat().filter((c) => c.focused)).toHaveLength(2);
    expect(fill.narration).toBe("You arrive from above or from the left: 1 + 1 = 2 paths.");
  });
});

describe("heap", () => {
  it("keeps the smallest on top, marks pushes, and names what a pop removed", () => {
    const all = views(specs.kthLargestHeap, kth());
    for (const m of all) {
      const h = find<"heap">(m.views, "heap");
      const vals = h.items.map((i) => Number(i.text));
      // The heap property, at every moment: no child is smaller than its parent.
      vals.forEach((v, i) => { if (i > 0) expect(v).toBeGreaterThanOrEqual(vals[Math.floor((i - 1) / 2)]); });
    }
    const pop = all.find((m) => m.ranLine === 9)!;
    expect(find<"heap">(pop.views, "heap").removed).toHaveLength(1);
    const push = all.find((m) => m.ranLine === 7)!;
    expect(find<"heap">(push.views, "heap").items.some((i) => i.state === "added")).toBe(true);
    expect(all.at(-1)!.returned).toBe("5");
  });
});

describe("graph", () => {
  it("draws every node once in a fixed place, with directed edges as they're added", () => {
    const all = views(specs.courseSchedule, courses());
    const positions = (m: (typeof all)[number]) => JSON.stringify(find<"graph">(m.views, "graph").nodes.map((n) => [n.key, n.x, n.y]));
    const shown = all.filter((m) => find<"graph">(m.views, "graph").present);
    expect(new Set(shown.map(positions)).size).toBe(1);
    const last = find<"graph">(all.at(-1)!.views, "graph");
    expect(last.nodes.map((n) => n.key)).toEqual(["0", "1", "2", "3"]);
    expect(last.edges.map((e) => `${e.from}>${e.to}`).sort()).toEqual(["0>1", "0>2", "1>3", "2>3"]);
    expect(last.directed).toBe(true);
    const drawn = all.find((m) => m.ranLine === 8)!;
    expect(find<"graph">(drawn.views, "graph").edges.filter((e) => e.fresh)).toEqual([{ from: "0", to: "1", fresh: true }]);
  });

  it("marks the course being taken, those waiting in the queue, and those done", () => {
    const all = views(specs.courseSchedule, courses());
    const take = all.find((m) => m.ranLine === 16)!;
    const g = find<"graph">(take.views, "graph");
    expect(g.nodes.find((n) => n.current)?.key).toBe("0");
    const end = find<"graph">(all.at(-1)!.views, "graph");
    expect(end.nodes.every((n) => n.visited)).toBe(true);
    expect(all.at(-1)!.narration).toBe("All 4 courses were taken: it’s possible.");
  });

  it("explains a cycle when courses wait on each other", () => {
    const all = views(specs.courseSchedule, courses(2, [[0, 1], [1, 0]]));
    expect(all.at(-1)!.narration).toBe("Only 0 of 2 could be taken: the rest wait on each other in a cycle.");
  });
});

describe("union-find", () => {
  it("draws the forest, marks roots and rewired parents, and finds the edge that closes a cycle", () => {
    const all = views(specs.redundantConnection, redundant());
    const first = find<"union-find">(all.find((m) => find<"union-find">(m.views, "groups").present)!.views, "groups");
    expect(first.nodes.map((n) => n.key)).toEqual(["1", "2", "3"]);
    expect(first.nodes.every((n) => n.root)).toBe(true);
    const join = all.find((m) => m.ranLine === 15)!;
    const g = find<"union-find">(join.views, "groups");
    expect(g.nodes.find((n) => n.key === "1")).toMatchObject({ parent: "2", root: false, changed: true });
    // A child sits a level below its parent.
    expect(g.nodes.find((n) => n.key === "1")!.y).toBe(g.nodes.find((n) => n.key === "2")!.y + 1);
    expect(all.at(-1)!.returned).toBe("[2, 3]");
  });
});
