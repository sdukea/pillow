import { describe, expect, it } from "vitest";
import { traceCPython } from "../testing/trace";
import { classify, extraSpace } from "./growth";

const pts = (f: (n: number) => number) => [8, 16, 32, 64, 128].map((n) => ({ n, value: f(n) }));

describe("growth classification", () => {
  it("recognises constant, logarithmic, linear, n log n and quadratic growth", () => {
    expect(classify(pts(() => 7))).toBe("1");
    expect(classify(pts((n) => 5 * Math.log2(n) + 3))).toBe("log n");
    expect(classify(pts((n) => 4 * n + 9))).toBe("n");
    expect(classify(pts((n) => n * Math.log2(n)))).toBe("n log n");
    expect(classify(pts((n) => (n * n) / 2 + n))).toBe("n²");
  });
  it("isn't fooled by a constant overhead on small inputs", () => {
    expect(classify(pts((n) => 3 * n + 200))).toBe("n");
  });
});

describe("extra space", () => {
  it("counts what the algorithm creates, not the input", () => {
    const keep = traceCPython({ source: "def f(a):\n    total = 0\n    for x in a:\n        total += x\n    return total\n", entry: "f", args: [{ kind: "value", value: [1, 2, 3, 4] }] });
    expect(extraSpace(keep)).toBe(0);
    const copy = traceCPython({ source: "def f(a):\n    seen = {}\n    for x in a:\n        seen[x] = 1\n    return len(seen)\n", entry: "f", args: [{ kind: "value", value: [1, 2, 3, 4] }] });
    expect(extraSpace(copy)).toBe(4);
  });
});
