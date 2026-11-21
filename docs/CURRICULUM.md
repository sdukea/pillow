# Curriculum

A 16-week plan to April 2027 that keeps going afterwards. Source of truth:
`src/curriculum/curriculum.ts`. It's derived from
`src/curriculum/sources.json`, and shown at `/roadmap`.

## Where the problems come from

Blind 75, NeetCode 150 and Grind 169, as compiled in
[sumitsingh4411/faang](https://github.com/sumitsingh4411/faang) (MIT). The
source commit and copyright notice are recorded in `sources.json`.

- **Deduplicated:** that's **205 problems**.
- **Regenerating:** `npm run curriculum -- <path to a faang checkout>`.
- **What's kept from the lists:** the slug from the official URL, the
  title, the difficulty, and each list's section and topic. Company tags
  aren't kept, because they're unverified.
- **No invented identifiers.** The slug is the ID, and URLs are built from
  it. LeetCode numbers appear only for problems with a built lesson, where
  they were checked by hand; LeetCode's API refuses automated requests, so
  nothing else is verified. Tests enforce this.

## Tiers

Tiers are deterministic and tested.

| Tier | Rule | Count |
|---|---|---|
| Core | In Blind 75, or in all three lists | 75 |
| Reinforcement | In two lists | 48 |
| Stretch | In one list | 82 |

## The 16 weeks

Each week introduces concepts whose prerequisites are already taught. A
problem sits in the first week by which all of its concepts are taught.

| Week | Title | Introduces | Problems (core) |
|---|---|---|---|
| 1 | Arrays and hashing | arrays, loops, strings, every pair, growth of work and memory, hash maps, sets, instant lookup, look for what you need, memory for speed, counting | 18 (6) |
| 2 | Two pointers and sorting | invariants, two pointers, sorted order, sorting, grids | 17 (6) |
| 3 | Sliding windows and running totals | sliding window, running totals, best run so far, queues, deques | 12 (6) |
| 4 | Stacks | stacks, matching pairs, monotonic stacks, designing a class | 13 (2) |
| 5 | Binary search | halving | 10 (2) |
| 6 | Linked lists | linked lists, rewiring links, fast and slow pointers | 14 (5) |
| 7 | Recursion and trees | recursion, the call stack, binary trees, recursion on trees, level by level, divide and conquer | 20 (8) |
| 8 | Search trees and tries | binary search trees, tries | 8 (6) |
| 9 | Heaps and intervals | heaps, quickselect, intervals | 14 (7) |
| 10 | Backtracking | backtracking | 11 (2) |
| 11 | Graphs | graphs, graph search | 11 (3) |
| 12 | Advanced graphs | dependency order, union-find, cheapest paths, minimum spanning trees | 13 (4) |
| 13 | Dynamic programming | remembering answers, dynamic programming | 14 (10) |
| 14 | Two-dimensional DP | two-dimensional DP, take it or leave it | 11 (2) |
| 15 | Greedy, bits and maths | greedy choices, bits, number tricks | 19 (6) |
| 16 | Review and mock interviews | — | review and Interview Mode |

**Dates:** the default plan starts Monday 14 December 2026 and week 16
ends Sunday 4 April 2027. Learners will set their own start date (P5).
**After April:** stretch problems, scheduled reviews and mock interviews
continue indefinitely.

## Where a student is

Worked out from evidence only (`src/curriculum/roadmap.ts`):

- **Current week:** the first week that introduces a concept not yet
  understood.
- **Next:** the first problem with a built lesson, from that week on, that
  isn't solved yet.
- **Solved:** an implementation that passes every case, as fast as the
  trick, without opening the solution.
- **Planned lessons:** problems without a lesson link to LeetCode until
  their lesson is built.

## Per-problem metadata

**Built now, for all 205:** slug, title, URL, difficulty, lists, tier,
week, primary concept, concepts, prerequisites, lesson status, review
status.

**Designed (P3), for each lesson as it's built:** the full lesson record
in `LESSON_STANDARD.md`. That covers objectives, misconceptions, variants,
brute force, optimal solution, invariants, edge cases, follow-ups, and
complexity measured from real runs.
