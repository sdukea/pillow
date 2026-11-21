# Concept ontology

The knowledge graph every lesson, question and mastery state hangs on.
Source of truth: `src/knowledge/concepts.ts` (concepts) and
`src/knowledge/misconceptions.ts` (misconceptions). Both are curated by
hand: the map is only as meaningful as this graph.

## Nodes (built)

| Kind | Count | Examples | Meaning |
|---|---|---|---|
| `foundation` | 7 | loops, complexity, invariants, recursion, number tricks | Ideas every technique rests on |
| `structure` | 15 | arrays, hash maps, stacks, linked lists, trees, heaps, tries, graphs, union-find, grids | Ways to hold data, each with its costs |
| `technique` | 33 | two pointers, sliding window, binary search, monotonic stack, backtracking, graph search, dynamic programming, greedy | Moves that solve a class of problems |

**55 concepts in total.** Each concept has:

- `id` and `name`;
- `kind`;
- `means`: one line on what understanding it means;
- `facts`: 2–4 key facts, covering how it works and what it costs;
- `useWhen`: when to reach for it;
- `requires`: the concepts it builds on.

**Misconception** nodes (18 today) belong to a concept. Each has a label,
an explanation and a fix. Lessons' wrong answers and hints point at them.

## Relations

| Relation | From → to | Where | Status |
|---|---|---|---|
| `requires` | concept → concept | `Concept.requires` | Built; acyclic (tested) |
| `teaches` | approach → concept | `Lesson.approaches[id].concepts` | Built for 6 lessons |
| `primary` / `exercises` | problem → concept | `CurriculumProblem.primary`, `.concepts` | Built for all 205 problems, from list topics (`review: "auto"`) |
| `prerequisite` | problem → concept | `CurriculumProblem.prerequisites` | Built (derived) |
| `introduced in` | concept → week | `WEEKS[].introduces` | Built; every concept is taught exactly once, after what it requires (tested) |
| `confused with` | misconception → concept | `Misconception.concept` | Built |
| `variant of`, `follow-up to` | problem → problem | | Designed (P3, the lesson schema) |
| `evidence for` | evidence → concept | `Evidence.concepts` | Built |

## How problems get their concepts

`src/curriculum/curriculum.ts` maps each source list's topic label to
concepts (for example, "Monotonic Stack" maps to `monotonic-stack`, and
"BFS" in a tree section maps to `bfs`, but to `graph-traversal` in a graph
section).

- **Preferred list:** NeetCode's label is preferred, then Grind's, then
  Blind's.
- **Section structure:** the section can add the data structure; for
  example, "Linked List" adds `linked-list`.
- **Other lists' labels** are kept only if they're already taught by that
  week.

Every problem stays `review: "auto"` until a person checks its tags, and
the roadmap can show that.

## Rules (tested)

- IDs are unique; every `requires` points at a real concept; there are no
  cycles.
- Every concept has a kind, at least two facts, and a "use it when".
- Every tag on a lesson or curriculum problem is a real concept.

## Adding a concept

1. Add it to `CONCEPTS`, with facts written for a student: precise, short,
   with costs.
2. Put it in a week in `WEEKS`, no earlier than its prerequisites.
3. If a list topic should map to it, update `topicConcepts`.
4. Run `npm test`. The ontology and curriculum tests catch mistakes.
