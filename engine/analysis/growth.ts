// Measures how an approach's work and memory grow with input size, from real traces, so the
// complexity a lesson claims can be checked rather than asserted.

import type { Trace } from "../tracer/types";

export type GrowthClass = "1" | "log n" | "n" | "n log n" | "n²";

export interface Point { n: number; value: number }

/** Total lines run: the "steps" counted throughout the product. */
export function stepsOf(trace: Trace): number {
  return Object.values(trace.lineHits).reduce((a, b) => a + b, 0);
}

/**
 * Peak extra memory, in elements: at each step, add up the size of every list, dict and set the
 * algorithm created (not the input), counting each new object such as a node as one. Take the peak.
 */
export function extraSpace(trace: Trace): number {
  if (!trace.steps.length) return 0;
  const input = new Set(Object.keys(trace.steps[0].heap));
  let peak = 0;
  for (const step of trace.steps) {
    let total = 0;
    for (const [id, obj] of Object.entries(step.heap)) {
      if (input.has(id)) continue;
      if ("items" in obj) total += obj.items.length;
      else if ("entries" in obj) total += obj.entries.length;
      else total += 1;
    }
    peak = Math.max(peak, total);
  }
  return peak;
}

const MODELS: [GrowthClass, (n: number) => number][] = [
  ["log n", (n) => Math.log2(n)],
  ["n", (n) => n],
  ["n log n", (n) => n * Math.log2(n)],
  ["n²", (n) => n * n],
];

/**
 * Classify growth from measurements at several sizes. Each candidate curve is fitted with least
 * squares as value ≈ a·f(n) + b (the b absorbs constant overhead, which dominates small inputs),
 * and the curve that fits best wins. If several fit about equally well, the simplest is chosen.
 * Values that barely change are constant.
 */
export function classify(points: Point[]): GrowthClass {
  const ys = points.map((p) => p.value);
  const lo = Math.min(...ys), hi = Math.max(...ys);
  if (hi - lo <= 2 || (lo > 0 && hi / lo < 1.25)) return "1";

  const fits = MODELS.flatMap(([name, f]) => {
    const xs = points.map((p) => f(p.n));
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    const a = xs.reduce((acc, x, i) => acc + (x - mx) * (ys[i] - my), 0) / sxx;
    if (!(a > 0)) return [];
    const b = my - a * mx;
    const rss = xs.reduce((acc, x, i) => acc + (ys[i] - (a * x + b)) ** 2, 0);
    return [{ name, rss }];
  });
  const scale = ys.reduce((a, y) => a + y * y, 0);
  const best = Math.min(...fits.map((f) => f.rss));
  // Simplest model within a whisker of the best fit (fits is ordered simplest first).
  return fits.find((f) => f.rss <= best * 1.05 + scale * 1e-9)!.name;
}
