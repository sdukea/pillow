// Notes: one per problem someone has learned. Each keeps the trick and how to spot the pattern,
// copied in, so a note reads the same even for problems explained live. Kept in this browser.
// Recall is the point: Home hides the trick until you've tried to remember it.

import { useSyncExternalStore } from "react";
import type { Problem } from "../content/problems";

const KEY = "pillow.notes";
export interface Note {
  slug: string;
  title: string;
  trick: string;
  recognize: string;
  pattern: string;
  savedAt: number;
  /** How many times it's been recalled from Home. */
  recalls: number;
}

const listeners = new Set<() => void>();
let cache: Note[] | null = null;

function read(): Note[] {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(v) ? v.filter((n) => n && typeof n.slug === "string" && typeof n.trick === "string") : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function write(notes: Note[]) {
  cache = notes;
  try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch { /* storage unavailable: lasts this visit */ }
  listeners.forEach((l) => l());
}

export function noteFor(problem: Problem): Omit<Note, "savedAt" | "recalls"> | null {
  const card = problem.lesson?.card;
  if (!card) return null;
  return { slug: problem.slug, title: problem.title, trick: card.trick, recognize: card.recognize, pattern: problem.lesson!.compare.pattern.name };
}

export function saveNote(problem: Problem) {
  const n = noteFor(problem);
  if (!n) return;
  const old = read().find((x) => x.slug === n.slug);
  write([{ ...n, savedAt: old?.savedAt ?? Date.now(), recalls: old?.recalls ?? 0 }, ...read().filter((x) => x.slug !== n.slug)]);
}

export function removeNote(slug: string) {
  write(read().filter((x) => x.slug !== slug));
}

export function markRecalled(slug: string) {
  write(read().map((x) => (x.slug === slug ? { ...x, recalls: x.recalls + 1 } : x)));
}

export function useNotes(): Note[] {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, read, () => []);
}

/** Earlier versions kept a shelf (and before that, recents): turn those into notes once. */
export function migrateOld(problems: Problem[]) {
  try {
    const shelf = JSON.parse(localStorage.getItem("pillow.shelf") ?? "null");
    const recent = JSON.parse(localStorage.getItem("pillow.recent") ?? "null");
    localStorage.removeItem("pillow.shelf");
    localStorage.removeItem("pillow.recent");
    const slugs = [...(Array.isArray(shelf) ? shelf.map((x: { slug?: string }) => x?.slug) : []), ...(Array.isArray(recent) ? recent : [])];
    for (const slug of [...new Set(slugs)].reverse()) {
      const p = problems.find((x) => x.slug === slug);
      if (p) saveNote(p);
    }
  } catch { /* nothing to migrate */ }
}
