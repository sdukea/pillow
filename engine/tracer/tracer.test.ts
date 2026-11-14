// The tracer is the foundation: if it's wrong, every visualization is wrong.
// These tests check that it records real execution faithfully, and that build-time
// CPython and in-browser Pyodide produce byte-for-byte the same trace.
import { beforeAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPyodide } from "pyodide";
import { traceWithPyodide, type PythonRuntime } from "./pyodide";
import type { Trace, TraceRequest, Value } from "./types";

const DIR = join(import.meta.dirname);
const TRACER = readFileSync(join(DIR, "tracer.py"), "utf8");
const fixture = (name: string) => readFileSync(join(DIR, "fixtures", `${name}.py`), "utf8");

function traceCPython(request: TraceRequest): Trace {
  const out = spawnSync("python3", [join(DIR, "tracer.py")], {
    input: JSON.stringify(request),
    env: { ...process.env, PYTHONHASHSEED: "0" },
    encoding: "utf8",
  });
  if (out.status !== 0) throw new Error(out.stderr);
  return JSON.parse(out.stdout) as Trace;
}

let py: PythonRuntime;
beforeAll(async () => {
  py = (await loadPyodide()) as unknown as PythonRuntime;
}, 60_000);
const tracePyodide = (request: TraceRequest) => traceWithPyodide(py, TRACER, request);

const v = (value: unknown) => ({ kind: "value" as const, value });
const CASES: { name: string; request: TraceRequest; expect: unknown }[] = [
  { name: "two_sum_brute", request: { source: fixture("two_sum_brute"), entry: "two_sum", args: [v([2, 7, 11, 15]), v(9)] }, expect: [0, 1] },
  { name: "two_sum_hash", request: { source: fixture("two_sum_hash"), entry: "two_sum", args: [v([3, 2, 4]), v(6)] }, expect: [1, 2] },
  { name: "valid_parentheses", request: { source: fixture("valid_parentheses"), entry: "is_valid", args: [v("([]{})")] }, expect: true },
  { name: "binary_search", request: { source: fixture("binary_search"), entry: "search", args: [v([-1, 0, 3, 5, 9, 12]), v(9)] }, expect: 4 },
  { name: "longest_substring", request: { source: fixture("longest_substring"), entry: "length_of_longest_substring", args: [v("abcabcbb")] }, expect: 3 },
  { name: "reverse_list", request: { source: fixture("reverse_list"), entry: "reverse_list", args: [{ kind: "linked_list", values: [1, 2, 3, 4] }] }, expect: "list 4,3,2,1" },
  { name: "max_depth", request: { source: fixture("max_depth"), entry: "max_depth", args: [{ kind: "tree", values: [3, 9, 20, null, null, 15, 7] }] }, expect: 3 },
];

/** Follow a linked list from a value through a heap, returning its values in order. */
function listValues(start: Value, heap: Trace["resultHeap"] = {}): unknown[] {
  const out: unknown[] = [];
  let cur = start;
  while (cur && typeof cur === "object" && "ref" in cur) {
    const node = heap[String(cur.ref)] as { fields: Record<string, Value> };
    out.push(node.fields.val);
    cur = node.fields.next;
  }
  return out;
}

function resultOf(t: Trace): unknown {
  if (t.result && typeof t.result === "object" && "ref" in t.result) {
    const obj = t.resultHeap![String(t.result.ref)];
    if ("items" in obj) return obj.items;
    if ("fields" in obj) return `list ${listValues(t.result, t.resultHeap).join(",")}`;
  }
  return t.result;
}

describe("reference solutions trace correctly", () => {
  for (const c of CASES) {
    it(`${c.name}: correct result, no errors, every step on a real line`, () => {
      const t = traceCPython(c.request);
      expect(t.ok).toBe(true);
      expect(t.truncated).toBe(false);
      expect(resultOf(t)).toEqual(c.expect);
      const lines = c.request.source.split("\n").length;
      for (const s of t.steps) {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(lines);
        expect(s.frames.length).toBeGreaterThan(0);
      }
    });
  }
});

describe("CPython (build time) and Pyodide (browser) produce identical traces", () => {
  for (const c of CASES) {
    it(c.name, () => {
      expect(tracePyodide(c.request)).toEqual(traceCPython(c.request));
    });
  }
});

describe("tracer behaviour", () => {
  it("is deterministic: the same input traces identically twice", () => {
    const c = CASES[5].request;
    expect(traceCPython(c)).toEqual(traceCPython(c));
  });

  it("keeps object ids stable across steps, so pointer moves are visible", () => {
    const t = traceCPython(CASES[5].request); // reverse_list
    const first = t.steps.find((s) => s.frames.at(-1)!.locals.cur)!;
    const headRef = first.frames.at(-1)!.locals.head as { ref: number };
    // The original head node keeps its id from the first step to the last.
    const last = t.steps.at(-1)!;
    expect(last.heap[String(headRef.ref)]).toBeDefined();
    // ...and by the end its next pointer has been rewired to nothing (it's the new tail).
    expect((last.heap[String(headRef.ref)] as { fields: Record<string, Value> }).fields.next).toBeNull();
  });

  it("records the pointer rewiring step by step", () => {
    const t = traceCPython(CASES[5].request);
    // Find the step right after `cur.next = prev` first runs (line 6), and check node 1's next is now None.
    const afterRewire = t.steps.findIndex((s, i) => i > 0 && t.steps[i - 1].line === 6);
    const s = t.steps[afterRewire];
    const prev = s.frames.at(-1)!.locals.cur as { ref: number };
    expect((s.heap[String(prev.ref)] as { fields: Record<string, Value> }).fields.next).toBeNull();
  });

  it("shows aliasing: two names for one list share a reference", () => {
    const t = traceCPython({ source: "def f(a):\n    b = a\n    b.append(1)\n    return a\n", entry: "f", args: [v([])] });
    const s = t.steps.find((x) => x.line === 3)!;
    expect(s.frames[0].locals.a).toEqual(s.frames[0].locals.b);
  });

  it("records recursion as a stack of frames", () => {
    const t = traceCPython(CASES[6].request); // max_depth on a tree of depth 3
    const deepest = Math.max(...t.steps.map((s) => s.frames.length));
    expect(deepest).toBe(4); // depth 3, plus one call on a missing child
    expect(t.steps.some((s) => s.event === "return" && s.returned === 3)).toBe(true);
  });

  it("stops at the step limit instead of running forever", () => {
    const t = traceCPython({ source: "def f():\n    while True:\n        pass\n", entry: "f", args: [], maxSteps: 50 });
    expect(t.ok).toBe(false);
    expect(t.truncated).toBe(true);
    expect(t.steps).toHaveLength(50);
    expect(t.error?.type).toBe("StepLimitReached");
  });

  it("a solution's own `except Exception` can't swallow the step limit", () => {
    const src = "def f():\n    try:\n        while True:\n            pass\n    except Exception:\n        return 'escaped'\n";
    const t = traceCPython({ source: src, entry: "f", args: [], maxSteps: 30 });
    expect(t.truncated).toBe(true);
  });

  it("reports an exception raised by the solution, with the step where it happened", () => {
    const t = traceCPython({ source: "def f(a):\n    return a[5]\n", entry: "f", args: [v([1, 2])] });
    expect(t.ok).toBe(false);
    expect(t.error?.type).toBe("IndexError");
    expect(t.steps.some((s) => s.event === "exception" && s.line === 2)).toBe(true);
  });

  it("encodes values JavaScript can't represent directly", () => {
    const t = traceCPython({ source: "def f():\n    lo = float('-inf')\n    big = 2 ** 60\n    return lo\n", entry: "f", args: [] });
    const s = t.steps.find((x) => x.line === 4)!;
    expect(s.frames[0].locals.lo).toEqual({ float: "-inf" });
    expect(s.frames[0].locals.big).toEqual({ bigint: (2n ** 60n).toString() }); // exact, unlike a JS number
  });

  it("counts how often each line runs (the basis for operation counts)", () => {
    const t = traceCPython(CASES[0].request); // brute force two sum, found at (0, 1)
    expect(t.lineHits["4"]).toBe(1); // the comparison ran once before returning
  });
});
