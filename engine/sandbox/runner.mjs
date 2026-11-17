// The sandbox child process. It runs untrusted Python (AI-drafted solutions and input
// generators) through the tracer, inside Pyodide (WebAssembly), inside a Node process started
// with the permission model: read-only access to Pyodide and the tracer, no writes, no child
// processes, no workers, no network, no native addons, and an empty environment. See
// engine/sandbox/sandbox.ts for how it's started and timed out.
//
// Protocol: one JSON object per line on stdin, {id, kind: "trace", request} or
// {id, kind: "call", source, entry, args}; one JSON object per line on stdout, {id, ok, ...}.

import { constants as fsConstants, readFileSync } from "node:fs";
import { createInterface } from "node:readline";

const [pyodideDir, tracerPath] = process.argv.slice(2);
// Pyodide's start-up asks process.binding("constants") for file flags (used only to mount host
// directories, which never happens here). The permission model blocks process.binding, so answer
// that one question with the public constants and nothing else.
Object.defineProperty(process, "binding", { configurable: true, value: (name) => {
  if (name === "constants") return { fs: { ...fsConstants } };
  throw new Error(`process.binding("${name}") is not available in the sandbox`);
} });
const { loadPyodide } = await import(`${pyodideDir}/pyodide.mjs`);
const py = await loadPyodide({ indexURL: `${pyodideDir}/`, stdout: () => {}, stderr: () => {} });

const tracer = readFileSync(tracerPath, "utf8").replace('if __name__ == "__main__":', "if False:");
py.runPython(tracer);
py.runPython(`
import json as _json

def _call_json(request_json):
    """Run a plain function (e.g. an input generator) on JSON args and return its JSON result."""
    req = _json.loads(request_json)
    ns = {}
    exec(compile(req["source"], "<generator>", "exec"), ns)
    return _json.dumps(ns[req["entry"]](*req["args"]))

# Untrusted code must not reach JavaScript (and through it, Node). Block the bridge modules.
import sys as _sys
for _m in ["js", "pyodide_js", "pyodide", "pyodide.ffi", "pyodide.code", "pyodide.http", "pyodide.console", "_pyodide", "micropip"]:
    _sys.modules[_m] = None
`);
const traceJson = py.globals.get("trace_json");
const callJson = py.globals.get("_call_json");

// Remove what the Python side can't otherwise reach anyway, as one more layer.
for (const k of ["kill", "dlopen", "binding", "_linkedBinding", "chdir", "abort"]) {
  try { delete process[k]; } catch { /* non-configurable */ }
}

const out = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");
out({ id: 0, ok: true, ready: true });

for await (const line of createInterface({ input: process.stdin })) {
  if (!line.trim()) continue;
  let msg;
  try { msg = JSON.parse(line); } catch { continue; }
  try {
    const raw = msg.kind === "trace" ? traceJson(JSON.stringify(msg.request)) : msg.kind === "call" ? callJson(JSON.stringify(msg)) : undefined;
    if (typeof raw !== "string") throw new Error(`Python returned nothing for ${msg.kind}`);
    out(msg.kind === "trace" ? { id: msg.id, ok: true, trace: JSON.parse(raw) } : { id: msg.id, ok: true, value: JSON.parse(raw) });
  } catch (err) {
    // An ordinary Python exception leaves the interpreter healthy. Anything else (a blocked
    // system call inside WebAssembly, a fatal error) may not: say so, and exit.
    const fatal = err?.constructor?.name !== "PythonError";
    out({ id: msg.id, ok: false, fatal, error: String(err?.message ?? err).split("\n").slice(-3).join("\n") });
    if (fatal) process.exit(70);
  }
}
