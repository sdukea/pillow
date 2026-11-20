import { describe, expect, it } from "vitest";
import { PROBLEMS } from "../content/problems";
import { shuffledIndices } from "./Learn";

describe("reasoning choices", () => {
  it("are shown in a fixed order, with the right answer landing in every position across lessons", () => {
    const firstSlots = new Set<number>();
    for (const p of PROBLEMS.filter((x) => x.lesson)) {
      p.lesson!.reasoning.forEach((step, k) => {
        const order = shuffledIndices(step.choices.length, `${p.slug}:${k}`);
        expect([...order].sort()).toEqual(step.choices.map((_, i) => i));
        expect(shuffledIndices(step.choices.length, `${p.slug}:${k}`)).toEqual(order); // stable
        firstSlots.add(order.indexOf(step.choices.findIndex((c) => c.correct)));
      });
    }
    expect(firstSlots.size).toBe(3); // first, middle and last all occur: position gives nothing away
  });
});
