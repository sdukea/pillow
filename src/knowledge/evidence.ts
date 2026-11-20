// The evidence log: every graded thing a student does, append-only. It's the only input to the
// student model, so the knowledge map can always say *why* it shows what it shows. Stored in this
// browser for now; the shape is meant to sync to a server later, unchanged.

import { useSyncExternalStore } from "react";
import type { ConceptId } from "./concepts";

export type Task =
  | "exposure"    // watched an approach run to the end: seen, not understood
  | "predict"     // predicted the next state of a real run
  | "complexity"  // said how the work grows, graded against measured growth
  | "recall"      // picked the right trick for a problem from memory
  | "reason";     // answered a Socratic question on the way to the trick

export interface Evidence {
  at: number;
  task: Task;
  problem: string;
  approach?: string;
  concepts: ConceptId[];
  /** Absent for exposure, which is never graded. */
  correct?: boolean;
  /** Whether a hint was used. A hinted answer is weaker evidence. */
  hinted?: boolean;
  /** For a wrong answer: the misconception it revealed. */
  misconception?: string;
  /** What was asked and answered, in a few words, for the map's explanation. */
  detail: string;
}

const KEY = "pillow.evidence";
const MAX = 5000;
const listeners = new Set<() => void>();
let cache: Evidence[] | null = null;

function read(): Evidence[] {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(v) ? v.filter((e) => e && typeof e.at === "number" && Array.isArray(e.concepts)) : [];
  } catch {
    cache = [];
  }
  return cache!;
}

export function record(e: Omit<Evidence, "at"> & { at?: number }) {
  const next = [...read(), { ...e, at: e.at ?? Date.now() }].slice(-MAX);
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable: lasts this visit */ }
  listeners.forEach((l) => l());
}

export function useEvidence(): Evidence[] {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, read, () => []);
}

export function allEvidence(): Evidence[] {
  return read();
}
