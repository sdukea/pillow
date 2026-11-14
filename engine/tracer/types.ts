// The shape of a trace produced by engine/tracer/tracer.py.
// Everything downstream (interpreter, view models, renderers) reads only these types.

export type HeapId = string;

/** A value in a frame or container. Containers and objects are references into the step's heap. */
export type Value =
  | null
  | boolean
  | number
  | string
  | { ref: number }
  | { bigint: string }
  | { float: "inf" | "-inf" | "nan" }
  | { callable: string };

export type HeapObject =
  | { type: "list" | "tuple" | "deque" | "set"; items: Value[] }
  | { type: "dict"; entries: [Value, Value][] }
  | { type: string; fields: Record<string, Value> } // ListNode, TreeNode, any class instance
  | { type: string; repr: string };                  // anything else, shown as text

export interface Frame {
  fn: string;
  line: number;
  locals: Record<string, Value>;
}

export interface Step {
  event: "call" | "line" | "return" | "exception";
  /** The line about to run (line events) or where the event happened. */
  line: number;
  /** Outermost first, so the last frame is the one executing. */
  frames: Frame[];
  heap: Record<HeapId, HeapObject>;
  returned?: Value;
  exception?: { type: string; message: string };
}

export interface Trace {
  ok: boolean;
  steps: Step[];
  /** How many times each line ran, keyed by line number. The basis for operation counts. */
  lineHits: Record<string, number>;
  truncated: boolean;
  result?: Value;
  resultHeap?: Record<HeapId, HeapObject>;
  error?: { type: string; message: string };
}

export type Arg =
  | { kind: "value"; value: unknown }
  | { kind: "linked_list"; values: unknown[] }
  | { kind: "tree"; values: unknown[] };

export interface TraceRequest {
  source: string;
  entry: string;
  args: Arg[];
  maxSteps?: number;
}
