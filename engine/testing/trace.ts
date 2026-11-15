// Test helper: trace a reference fixture with CPython, the same way the build will.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Arg, Trace, TraceRequest } from "../tracer/types";

const TRACER_DIR = join(import.meta.dirname, "..", "tracer");

export function fixtureSource(name: string): string {
  return readFileSync(join(TRACER_DIR, "fixtures", `${name}.py`), "utf8");
}

export function traceCPython(request: TraceRequest): Trace {
  const out = spawnSync("python3", [join(TRACER_DIR, "tracer.py")], {
    input: JSON.stringify(request),
    env: { ...process.env, PYTHONHASHSEED: "0" },
    encoding: "utf8",
  });
  if (out.status !== 0) throw new Error(out.stderr);
  return JSON.parse(out.stdout) as Trace;
}

export function traceFixture(name: string, entry: string, args: Arg[]): Trace {
  return traceCPython({ source: fixtureSource(name), entry, args });
}

export const value = (v: unknown): Arg => ({ kind: "value", value: v });
