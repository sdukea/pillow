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
  | { kind: "call-stack"; id: string; show: string[]; label?: string }
  /**
   * A list of lists drawn as a table: a DP table or a matrix. `pointers` mark cells by row and
   * column expressions, e.g. [{ row: "r", col: "c" }] for the cell being filled.
   */
  | { kind: "grid"; id: string; of: string; label?: string; pointers?: { row: string; col: string; label?: string }[] }
  /** A list kept as a heap by heapq, drawn as the binary tree it represents (index i's children are 2i+1 and 2i+2). */
  | { kind: "heap"; id: string; of: string; label?: string }
  /**
   * A graph from an adjacency dict or list (graph[u] lists u's neighbours, or (neighbour, weight)
   * pairs). Nodes keep one place for the whole run. `visited`, `current` and `frontier` are
   * expressions for the nodes done, being handled, and waiting (a set, list, dict or deque).
   */
  | { kind: "graph"; id: string; of: string; label?: string; directed?: boolean; visited?: string; current?: string; frontier?: string }
  /** Union-find's parent list (or dict), drawn as a forest: every item points to its parent; roots point to themselves. */
  | { kind: "union-find"; id: string; of: string; label?: string; /** The first index to draw, e.g. 1 when index 0 is unused. */ start?: number };

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
  focus?: { view: string; key?: string; index?: string; /** Grid cells read by the line, as [row, col] expressions. */ cells?: [string, string][] };
}

export interface VizSpec {
  views: ViewSpec[];
  lines: Record<number, LineSpec>;
}
