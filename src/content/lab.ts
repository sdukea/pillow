// The view lab: reference solutions that exercise each kind of view, for checking how they draw
// before any lesson uses them. Their traces are built and their specs validated by `npm run traces`,
// like every lesson's. The lab page itself only exists in development.
import type { Arg } from "../../engine/tracer/types";
import type { VizSpec } from "../../engine/interpreter/spec";
import { courseSchedule, kthLargestHeap, redundantConnection, uniquePaths } from "../../engine/interpreter/fixtures/specs";

export interface LabEntry { id: string; title: string; solution: string; entry: string; args: Arg[]; spec: VizSpec }

const v = (value: unknown): Arg => ({ kind: "value", value });

export const LAB: LabEntry[] = [
  { id: "grid", title: "Grid: a DP table (Unique Paths, 3 × 4)", solution: "unique_paths", entry: "unique_paths", args: [v(3), v(4)], spec: uniquePaths },
  { id: "heap", title: "Heap: the k largest (Kth Largest Element, k = 2)", solution: "kth_largest_heap", entry: "find_kth_largest", args: [v([3, 2, 1, 5, 6, 4]), v(2)], spec: kthLargestHeap },
  { id: "graph", title: "Graph: dependency order (Course Schedule)", solution: "course_schedule", entry: "can_finish", args: [v(4), v([[1, 0], [2, 0], [3, 1], [3, 2]])], spec: courseSchedule },
  { id: "union-find", title: "Union-find: the edge that closes a cycle (Redundant Connection)", solution: "redundant_connection", entry: "find_redundant_connection", args: [v([[1, 2], [1, 3], [2, 3]])], spec: redundantConnection },
];

export const labFile = (e: LabEntry) => `lab--${e.id}.json`;
