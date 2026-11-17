// Random valid inputs for a problem's input fields, from a seeded generator so failures
// reproduce. Used to test lessons on inputs nobody wrote, and to differential-test AI drafts.

import type { Arg } from "../../engine/tracer/types";
import type { InputField } from "./inputs";

export function rng(seed: number): () => number {
  return () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
}

const CLOSE: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

export function generateInput(fields: InputField[], r: () => number): Arg[] {
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  return fields.map((f): Arg => {
    const n = int(f.min ?? 0, f.max ?? 1);
    switch (f.type) {
      case "int": return { kind: "value", value: int(-20, 40) };
      case "int-list": {
        if (f.rule === "sorted-unique") {
          const s = new Set<number>();
          while (s.size < n) s.add(int(-30, 30));
          return { kind: "value", value: [...s].sort((a, b) => a - b) };
        }
        // A small range, so repeats and matching pairs actually happen.
        return { kind: "value", value: Array.from({ length: n }, () => int(-10, 20)) };
      }
      case "linked-list": return { kind: "linked_list", values: Array.from({ length: n }, () => int(0, 99)) };
      case "string": {
        if (f.rule === "brackets-only") {
          // Half the time a balanced string, so the "everything matched" path runs too.
          if (r() < 0.5) {
            let s = "";
            const open: string[] = [];
            while (s.length + open.length < n) {
              if (open.length && r() < 0.5) s += CLOSE[open.pop()!];
              else { const c = "([{"[int(0, 2)]; open.push(c); s += c; }
            }
            return { kind: "value", value: s + open.reverse().map((c) => CLOSE[c]).join("") };
          }
          return { kind: "value", value: Array.from({ length: n }, () => "()[]{}"[int(0, 5)]).join("") };
        }
        const alphabet = "abcab cd";
        return { kind: "value", value: Array.from({ length: n }, () => alphabet[int(0, alphabet.length - 1)]).join("") };
      }
      case "tree": {
        const values: (number | null)[] = [];
        let slots = 1, nodes = 0;
        while (slots > 0 && nodes < n) {
          const isNode = values.length === 0 || r() < 0.7;
          values.push(isNode ? int(1, 99) : null);
          slots--;
          if (isNode) { slots += 2; nodes++; }
        }
        while (values.length && values.at(-1) === null) values.pop();
        return { kind: "tree", values };
      }
    }
  });
}
