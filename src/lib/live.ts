// The main-thread side of live tracing: one lazily started worker, request ids, and timeouts.
// A run that overstays its time is stopped by terminating the worker; the next run starts a
// fresh one. Python loads on first use (or when the input form opens), never on page load.

import type { Trace, TraceRequest } from "../../engine/tracer/types";
import type { WorkerIn, WorkerOut } from "./python.worker";

/** Loading Python the first time downloads and compiles a few megabytes. */
const LOAD_TIMEOUT = 45_000;
/** Every reference solution on an allowed input finishes in well under a second. */
const RUN_TIMEOUT = 8_000;
/** Snapshots kept per run. The input limits keep real runs far below this. */
export const LIVE_MAX_STEPS = 4_000;

interface Pending { resolve: (m: WorkerOut) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }

let worker: Worker | undefined;
let ready = false;
let nextId = 1;
const pending = new Map<number, Pending>();

function failAll(message: string) {
  for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error(message)); }
  pending.clear();
}

function stop(message: string) {
  worker?.terminate();
  worker = undefined;
  ready = false;
  failAll(message);
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./python.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<WorkerOut>) => {
      const p = pending.get(e.data.id);
      if (e.data.type !== "error") ready = true;
      if (!p) return;
      clearTimeout(p.timer);
      pending.delete(e.data.id);
      p.resolve(e.data);
    };
    worker.onerror = (e) => stop(e.message || "Python stopped unexpectedly.");
  }
  return worker;
}

type Message = WorkerIn extends infer M ? (M extends WorkerIn ? Omit<M, "id"> : never) : never;

function send(msg: Message): Promise<WorkerOut> {
  const id = nextId++;
  const w = getWorker();
  return new Promise((resolve, reject) => {
    const timeout = ready ? RUN_TIMEOUT : LOAD_TIMEOUT;
    const timer = setTimeout(() => stop(ready ? "This run took too long and was stopped." : "Python took too long to load. Check your connection and try again."), timeout);
    pending.set(id, { resolve, reject, timer });
    w.postMessage({ ...msg, id } as WorkerIn);
  });
}

/** True once Python has loaded in this page. */
export const pythonReady = () => ready;

/** Start loading Python ahead of time, e.g. when the learner opens the input form. */
export function warmPython(): void {
  if (!worker) send({ type: "warm" }).catch(() => { /* reported on the next real run */ });
}

export async function traceLive(request: TraceRequest): Promise<Trace> {
  const out = await send({ type: "trace", request: { maxSteps: LIVE_MAX_STEPS, ...request } });
  if (out.type === "error") throw new Error(out.message);
  if (out.type !== "trace") throw new Error("Unexpected reply from Python.");
  return out.trace;
}
