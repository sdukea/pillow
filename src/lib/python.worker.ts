// Runs the tracer in Pyodide, off the main thread. The app serves Pyodide itself (public/pyodide),
// so nothing depends on a CDN. Only trace requests come in: fixed reference solutions plus the
// learner's input as data. The main thread terminates this worker if a run takes too long.

import { traceWithPyodide, type PythonRuntime } from "../../engine/tracer/pyodide";
import type { TraceRequest } from "../../engine/tracer/types";
import tracerSource from "../../engine/tracer/tracer.py?raw";

export type WorkerIn = { id: number; type: "warm" } | { id: number; type: "trace"; request: TraceRequest };
export type WorkerOut =
  | { id: number; type: "ready" }
  | { id: number; type: "trace"; trace: import("../../engine/tracer/types").Trace }
  | { id: number; type: "error"; message: string };

let python: Promise<PythonRuntime> | undefined;

function load(): Promise<PythonRuntime> {
  python ??= (async () => {
    const base = new URL(`${import.meta.env.BASE_URL}pyodide/`, self.location.origin).href;
    const { loadPyodide } = (await import(/* @vite-ignore */ `${base}pyodide.mjs`)) as { loadPyodide: (o: { indexURL: string }) => Promise<unknown> };
    return (await loadPyodide({ indexURL: base })) as PythonRuntime;
  })();
  return python;
}

const post = (m: WorkerOut) => self.postMessage(m);

self.onmessage = async (e: MessageEvent<WorkerIn>) => {
  const msg = e.data;
  try {
    const py = await load();
    if (msg.type === "warm") post({ id: msg.id, type: "ready" });
    else post({ id: msg.id, type: "trace", trace: traceWithPyodide(py, tracerSource, msg.request) });
  } catch (err) {
    python = undefined; // a failed load can be retried
    post({ id: msg.id, type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
