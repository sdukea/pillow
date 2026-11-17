// Runs untrusted Python (AI-drafted solutions and input generators) in an isolated child process.
// Layers, outermost first:
//   1. A separate Node process with the permission model: it may read only the Pyodide files and
//      the tracer; no file writes, child processes, workers, addons or network.
//   2. An empty environment, so no secrets (e.g. ANTHROPIC_API_KEY) are visible to it.
//   3. Python runs in Pyodide (WebAssembly) with an in-memory file system, and the modules that
//      bridge to JavaScript are blocked.
//   4. Every request has a timeout; on timeout the process is killed and the next request starts
//      a fresh one. A memory cap limits the JavaScript heap.

import { type ChildProcess, spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import type { Trace, TraceRequest } from "../tracer/types";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const PYODIDE = join(ROOT, "node_modules", "pyodide");
const TRACER = join(ROOT, "engine", "tracer", "tracer.py");
const RUNNER = join(HERE, "runner.mjs");

/** Network isolation (--allow-net) arrived in Node 25; refuse to run untrusted code without it. */
export function sandboxSupported(): boolean {
  return Number(process.versions.node.split(".")[0]) >= 25;
}

interface Pending { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }

export class Sandbox {
  private child?: ChildProcess;
  private ready?: Promise<void>;
  private pending = new Map<number, Pending>();
  private nextId = 1;

  constructor(private readonly timeoutMs = 20_000) {
    if (!sandboxSupported()) throw new Error(`The sandbox needs Node 25 or later for network isolation (this is ${process.version}).`);
  }

  private start(): Promise<void> {
    this.ready ??= new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ["--permission", `--allow-fs-read=${PYODIDE}`, `--allow-fs-read=${TRACER}`, `--allow-fs-read=${RUNNER}`, "--max-old-space-size=512", RUNNER, PYODIDE, TRACER],
        { env: {}, stdio: ["pipe", "pipe", "pipe"] },
      );
      this.child = child;
      let stderr = "";
      child.stderr!.on("data", (d) => { stderr += d; });
      const startTimer = setTimeout(() => { this.kill("The sandbox took too long to start."); reject(new Error("The sandbox took too long to start.")); }, 60_000);
      createInterface({ input: child.stdout! }).on("line", (line) => {
        if (this.child !== child) return; // a process that was already replaced
        let msg: { id: number; ok: boolean; ready?: boolean; fatal?: boolean; error?: string; trace?: Trace; value?: unknown };
        try { msg = JSON.parse(line); } catch { return; }
        if (msg.ready) { clearTimeout(startTimer); resolve(); return; }
        const p = this.pending.get(msg.id);
        if (!p) return;
        clearTimeout(p.timer);
        this.pending.delete(msg.id);
        // After a fatal error the interpreter can't be trusted: replace it before anything else runs.
        if (msg.fatal) this.kill("The previous run left the sandbox in a bad state.");
        if (msg.ok) p.resolve(msg.trace ?? msg.value);
        else p.reject(new Error(msg.error));
      });
      child.on("exit", (code) => {
        clearTimeout(startTimer);
        if (this.child !== child) return; // already replaced; don't disturb its successor
        const why = `The sandbox exited (code ${code}). ${stderr.trim().split("\n").slice(-2).join(" ")}`.trim();
        this.reset(why);
        reject(new Error(why));
      });
    });
    return this.ready;
  }

  private reset(why: string) {
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error(why)); }
    this.pending.clear();
    this.child = undefined;
    this.ready = undefined;
  }

  private kill(why: string) {
    const c = this.child;
    this.reset(why);
    c?.kill("SIGKILL");
  }

  private async send(msg: Record<string, unknown>): Promise<unknown> {
    await this.start();
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.kill(`Timed out after ${this.timeoutMs / 1000} s and was stopped.`), this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.child!.stdin!.write(JSON.stringify({ ...msg, id }) + "\n");
    });
  }

  /** Trace a solution, exactly as the build's tracer would, but isolated. */
  trace(request: TraceRequest): Promise<Trace> {
    return this.send({ kind: "trace", request }) as Promise<Trace>;
  }

  /** Call a plain Python function with JSON args, e.g. an input generator. Returns its JSON result. */
  call(source: string, entry: string, args: unknown[]): Promise<unknown> {
    return this.send({ kind: "call", source, entry, args });
  }

  close() {
    this.child?.stdin?.end();
    this.kill("closed");
  }
}

