import type { Trace, TraceRequest } from "./types";

/** The parts of a Pyodide instance the tracer needs. Works in Node (tests) and in a browser worker. */
export interface PythonRuntime {
  runPython(code: string): unknown;
  globals: { get(name: string): unknown };
}

const loaded = new WeakSet<PythonRuntime>();

/**
 * Trace one call inside Pyodide. `tracerSource` is the text of tracer.py; callers load it
 * however suits their environment (a file read in Node, a `?raw` import in the browser).
 */
export function traceWithPyodide(py: PythonRuntime, tracerSource: string, request: TraceRequest): Trace {
  if (!loaded.has(py)) {
    // Load the module body without running its command-line entry point.
    py.runPython(tracerSource.replace('if __name__ == "__main__":', "if False:"));
    loaded.add(py);
  }
  const traceJson = py.globals.get("trace_json") as (json: string) => string;
  return JSON.parse(traceJson(JSON.stringify(request))) as Trace;
}
