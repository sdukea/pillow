// The shelf: the films someone has watched or saved, kept in this browser. A film is added when it
// reaches its last scene, or when the viewer saves it; they can remove it from Home.

import { useSyncExternalStore } from "react";

const KEY = "pillow.shelf";
export interface ShelfItem { slug: string; title: string; savedAt: number }

const listeners = new Set<() => void>();
let cache: ShelfItem[] | null = null;

function read(): ShelfItem[] {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(v) ? v.filter((x) => x && typeof x.slug === "string" && typeof x.title === "string") : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function write(items: ShelfItem[]) {
  cache = items;
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable: lasts this visit */ }
  listeners.forEach((l) => l());
}

export function saveToShelf(slug: string, title: string) {
  write([{ slug, title, savedAt: Date.now() }, ...read().filter((x) => x.slug !== slug)].slice(0, 50));
}

export function removeFromShelf(slug: string) {
  write(read().filter((x) => x.slug !== slug));
}

export function useShelf(): ShelfItem[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    read,
    () => [],
  );
}

/** Earlier versions kept a "recent" list; carry it onto the shelf once. */
export function migrateRecents(titles: Record<string, string>) {
  try {
    const old = JSON.parse(localStorage.getItem("pillow.recent") ?? "null");
    if (!Array.isArray(old)) return;
    localStorage.removeItem("pillow.recent");
    const known = old.filter((s): s is string => typeof s === "string" && s in titles);
    if (known.length && read().length === 0) write(known.map((slug, i) => ({ slug, title: titles[slug], savedAt: Date.now() - i })));
  } catch { /* nothing to migrate */ }
}
