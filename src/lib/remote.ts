// Talking to Pillow's API server, for problems that aren't built into the app. On a static host
// (GitHub Pages) there's no server, and the app says so instead of failing quietly.

import type { Trace } from "../../engine/tracer/types";
import { fromLibrary, type LibraryEntry } from "../content/draft";
import type { Problem } from "../content/problems";
import type { Measured } from "../content/validateLesson";
import { registerRemote } from "./data";
import { href } from "./router";

export type ExplainEvent =
  | { type: "status"; stage: "identify" | "draft" | "check" | "film"; message: string }
  | { type: "problem"; title: string; number: number; statement: string }
  | { type: "ready"; slug: string; builtIn: boolean }
  | { type: "error"; message: string };

const api = (path: string) => href(`/api${path}`);

/** Whether a server is reachable here, and whether it can explain new problems. */
export async function serverStatus(): Promise<{ reachable: boolean; explain: boolean }> {
  try {
    const r = await fetch(api("/health"));
    if (!r.ok) return { reachable: false, explain: false };
    const body = (await r.json()) as { explain?: boolean };
    return { reachable: true, explain: Boolean(body.explain) };
  } catch {
    return { reachable: false, explain: false };
  }
}

/** Ask the server to explain a problem, reporting each stage as it streams in. */
export async function explain(query: string, onEvent: (e: ExplainEvent) => void, signal?: AbortSignal): Promise<void> {
  const r = await fetch(api("/explain"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }), signal });
  if (!r.ok || !r.body) {
    const body = await r.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Pillow's server didn't answer.");
  }
  const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let cut;
    while ((cut = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const data = chunk.split("\n").filter((l) => l.startsWith("data: ")).map((l) => l.slice(6)).join("\n");
      if (data) onEvent(JSON.parse(data) as ExplainEvent);
    }
  }
}

const loaded = new Map<string, Problem>();

/** Load a generated problem by slug and register it so the film can play it. */
export async function loadRemote(slug: string): Promise<Problem> {
  const hit = loaded.get(slug);
  if (hit) return hit;
  const r = await fetch(api(`/problems/${encodeURIComponent(slug)}`)).catch(() => null);
  if (!r || !r.ok) throw new Error(r?.status === 404 ? "This film isn't available." : "Pillow's server isn't reachable here.");
  const { entry, traces, growth } = (await r.json()) as { entry: LibraryEntry; traces: Record<string, Trace>; growth: Measured };
  const problem = fromLibrary(entry);
  registerRemote(problem, Object.fromEntries(entry.draft.approaches.map((a) => [a.id, a.solution])), traces, growth);
  loaded.set(slug, problem);
  return problem;
}
