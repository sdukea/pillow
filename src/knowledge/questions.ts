// Questions that produce evidence, generated rather than written, so every problem (including
// AI-drafted ones) gets them. Prediction questions come straight from real traces: the answer is
// what the code actually did, so it's always right. Complexity questions are graded against the
// growth the build measured.

import type { GrowthClass } from "../../engine/analysis/growth";
import type { MomentView, Prepared, ViewModel } from "../../engine/interpreter/viewmodel";
import type { Problem } from "../content/problems";

export interface Choice { label: string; correct: boolean }

export interface Prediction {
  /** Pause the run here and ask. */
  moment: number;
  /** The moment that reveals the answer. */
  reveal: number;
  prompt: string;
  choices: Choice[];
  /** For the evidence log. */
  detail: string;
}

/** A marker is one thing on screen that moves as the code runs. */
interface Marker { key: string; prompt: string; value: string | null; options: string[]; surprise: number }

function markers(view: MomentView, prev?: MomentView): Marker[] {
  const out: Marker[] = [];
  for (const v of view.views) {
    if (v.kind === "array" && v.present) {
      for (const p of v.pointers) {
        const before = prev ? arrayPointer(prev.views, v.id, p.name) : undefined;
        const cell = v.cells[p.index];
        out.push({
          key: `${v.id}:${p.name}`,
          prompt: `Where does \`${p.name}\` point next?`,
          value: cell ? cellLabel(p.index, cell.text) : null,
          options: v.cells.map((c) => cellLabel(c.index, c.text)),
          // A pointer that jumps (resets, halves) is more worth predicting than one that steps by one.
          surprise: before === undefined ? 0 : Math.abs(p.index - before) === 1 ? 1 : 2,
        });
      }
    } else if (v.kind === "linked-list") {
      const names = new Set(v.nodes.flatMap((n) => n.pointers));
      for (const name of names) {
        const node = v.nodes.find((n) => n.pointers.includes(name));
        out.push({ key: `${v.id}:${name}`, prompt: `Which node does \`${name}\` point to next?`, value: node ? `node ${node.text}` : "None", options: [...v.nodes.map((n) => `node ${n.text}`), "None"], surprise: 1 });
      }
    } else if (v.kind === "tree") {
      const cur = v.nodes.find((n) => n.current);
      out.push({ key: `${v.id}:current`, prompt: "Which node is visited next?", value: cur ? `node ${cur.text}` : null, options: v.nodes.map((n) => `node ${n.text}`), surprise: 2 });
    } else if ((v.kind === "stack" || v.kind === "queue") && v.present) {
      const top = v.kind === "stack" ? v.items.at(-1) : v.items[0];
      out.push({
        key: `${v.id}:end`,
        prompt: v.kind === "stack" ? `What will be on top of \`${v.label.split(" ")[0]}\` next?` : `What will be at the front of \`${v.label.split(" ")[0]}\` next?`,
        value: top ? top.text : "empty",
        options: [...new Set([...v.items.map((i) => i.text), "empty"])],
        surprise: 2,
      });
    }
  }
  return out;
}

const cellLabel = (i: number, text: string) => `index ${i} (${text})`;
function arrayPointer(views: ViewModel[], id: string, name: string): number | undefined {
  const v = views.find((x) => x.id === id);
  return v?.kind === "array" ? v.pointers.find((p) => p.name === name)?.index : undefined;
}

/**
 * The best prediction to ask in a run: a moment where something on screen is about to change,
 * preferring surprising changes, early enough that the student has context but before the end.
 */
export function predictionFor(prepared: Prepared, seed = 0): Prediction | null {
  const n = prepared.moments.length;
  if (n < 4) return null;
  const views = Array.from({ length: n }, (_, i) => prepared.view(i));
  let best: { score: number; q: Prediction } | null = null;
  for (let m = 2; m < Math.min(n - 1, Math.max(6, Math.floor(n * 0.6))); m++) {
    for (const mk of markers(views[m], views[m - 1])) {
      if (mk.value === null) continue;
      // The next moment where this marker shows something different.
      let r = m + 1;
      let next: Marker | undefined;
      while (r < n) {
        next = markers(views[r], views[r - 1]).find((x) => x.key === mk.key);
        if (!next || next.value !== mk.value) break;
        r++;
      }
      if (!next || next.value === null || next.value === mk.value || r >= n) continue;
      // Ask right before the change, while everything needed to reason about it is on screen.
      const gap = r - m;
      if (gap > 2) continue;
      const surprise = next.surprise;
      const distractors = pick(next.options.filter((o) => o !== next!.value), [mk.value], 2, seed + m);
      if (distractors.length < 2) continue;
      const score = surprise * 10 - m * 0.1; // prefer surprising, then early
      if (!best || score > best.score) {
        best = {
          score,
          q: {
            moment: m,
            reveal: r,
            prompt: mk.prompt,
            choices: shuffle([{ label: next.value, correct: true }, ...distractors.map((d) => ({ label: d, correct: false }))], seed + m),
            detail: `${mk.prompt.replace(/`/g, "")} → ${next.value}`,
          },
        };
      }
    }
  }
  return best?.q ?? null;
}

/** Distractors: always include the "nothing changes" answer if given, then nearby options. */
function pick(options: string[], prefer: string[], k: number, seed: number): string[] {
  const chosen = prefer.filter((p) => options.includes(p));
  const rest = shuffle(options.filter((o) => !chosen.includes(o)), seed);
  return [...chosen, ...rest].slice(0, k);
}

function shuffle<T>(xs: T[], seed: number): T[] {
  const a = xs.slice();
  let s = seed * 9301 + 49297;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ------------------------------------------------------------------ complexity

const GROWTH_ANSWERS: { cls: GrowthClass; label: string }[] = [
  { cls: "1", label: "About the same" },
  { cls: "log n", label: "Just one more step" },
  { cls: "n", label: "About twice as many" },
  { cls: "n²", label: "About four times as many" },
];

export interface ComplexityQuestion { prompt: string; choices: Choice[]; detail: string; truth: GrowthClass }

/** "If the input were twice as long, this way would take…", graded against measured growth. */
export function complexityFor(problem: Problem, approachId: string): ComplexityQuestion | null {
  const c = problem.lesson?.approaches[approachId]?.complexity;
  if (!c) return null;
  const truth = c.time;
  const choices = GROWTH_ANSWERS.map((g) => ({ label: g.label, correct: g.cls === truth }));
  if (!choices.some((x) => x.correct)) return null; // e.g. n log n: no honest plain-words answer among these
  return { prompt: "If the input were twice as long, this way would take…", choices, detail: `doubling the input: ${choices.find((x) => x.correct)!.label.toLowerCase()}`, truth };
}

// ------------------------------------------------------------------ recall

export interface RecallQuestion { prompt: string; choices: Choice[] }

/** "Which trick solves this?", with other problems' tricks as the alternatives. */
export function recallFor(problem: Problem, all: Problem[], seed: number): RecallQuestion | null {
  const trick = problem.lesson?.card.trick;
  if (!trick) return null;
  const others = all.filter((p) => p.slug !== problem.slug && p.lesson?.card).map((p) => p.lesson!.card.trick);
  if (others.length < 2) return null;
  const wrong = shuffle(others, seed).slice(0, 2);
  return { prompt: `Which trick solves ${problem.title}?`, choices: shuffle([{ label: trick, correct: true }, ...wrong.map((w) => ({ label: w, correct: false }))], seed + 1) };
}
