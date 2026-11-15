// The visualization spec: a small, declarative description of how to *show* a trace.
// It names which real variables are arrays, pointers, windows, maps, stacks, lists or trees,
// and attaches narration to lines. It cannot create or alter state, only point at it.

export type ViewSpec =
  | {
      kind: "array";
      id: string;
      /** Expression for the list or string to draw, e.g. "nums" or "s". */
      of: string;
      label?: string;
      /** Integer variables drawn as markers under cells, e.g. ["i"] or ["lo", "mid", "hi"]. */
      pointers?: string[];
      /** Inclusive range drawn as a band, e.g. a sliding window from "left" to "right". */
      range?: { from: string; to: string; label?: string };
    }
  | { kind: "map"; id: string; of: string; label?: string }
  | { kind: "set"; id: string; of: string; label?: string }
  | { kind: "stack"; id: string; of: string; label?: string }
  | { kind: "queue"; id: string; of: string; label?: string }
  /** Scalar values worth watching, as expressions, e.g. ["best", "right - left + 1"]. */
  | { kind: "vars"; id: string; show: string[]; label?: string }
  /** Every linked-list node in the trace, with these variables marking nodes. */
  | { kind: "linked-list"; id: string; pointers: string[]; label?: string }
  /**
   * A binary tree. `root` is read from the entry frame at the start. `current` names the
   * variable holding each call's node, so the active call's node can be highlighted.
   */
  | {
      kind: "tree"; id: string; root: string; current: string; label?: string;
      /**
       * A list or queue of nodes waiting to be handled (e.g. "queue" in breadth-first search).
       * Those nodes are ringed. Without it, nodes held by calls on the call stack are ringed.
       */
      waiting?: string;
      /** Show the value each call returned on its node. Default true; turn off for non-recursive code. */
      showReturns?: boolean;
    }
  /** The call stack, showing these expressions for each frame (e.g. ["root.val"]). */
  | { kind: "call-stack"; id: string; show: string[]; label?: string };

export type LineTag = "init" | "loop" | "compare" | "lookup" | "update" | "move" | "branch" | "call" | "return";

export interface Narration {
  /** Only use this text when the expression is true (evaluated after the line ran). */
  when?: string;
  /** Text with {expressions} filled in from the real state, e.g. "{x} needs {need}". */
  text: string;
}

export interface LineSpec {
  tag?: LineTag;
  /** Shown when this line has just run. The first entry whose `when` holds is used. */
  narrate?: Narration[];
  /** Highlight something a line looks at without changing, e.g. the key a lookup checks. */
  focus?: { view: string; key?: string; index?: string };
}

export interface VizSpec {
  views: ViewSpec[];
  lines: Record<number, LineSpec>;
}
