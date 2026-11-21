# LeetSee: product and technical assessment

*Phases 1–3 of the brief: repository audit, product and technical design,
MVP. Written before any LeetSee code. Architectural decisions are recorded
in [adr/](../adr/).*

*Update: the repository was reset for LeetSee after this assessment. The
audit in §2 describes the repository as it was then.*

---

## 1. Verdict

**Worth building, but not as described.** "Watch a LeetCode solution run
step by step" is already a crowded space. A quick search found at least five
live products that animate LeetCode solutions line by line:

- [Codedive](https://codedive.in/): 240+ problems with a variable inspector
  and custom input.
- [Algorithms Visualizer](https://www.algorithms-visualizer.com/problems):
  50+ problems.
- [Expora](https://tryexpora.com/): runs your own code step by step, with a
  Chrome extension.
- [LeetVision](https://leet-vision.com/).
- [LeetCode Visualizer](https://www.leetcode-visualizer.in/).
- Open-source collections on GitHub, such as
  [ValentinoFilipetto/leetcode-visualizer](https://github.com/ValentinoFilipetto/leetcode-visualizer).

A [May 2026 comparison](https://tryexpora.com/blog/best-algorithm-visualizer-coding-interviews)
treats this as a category.

So **the animation is not the product.** If LeetSee wins, it wins on the
part the brief puts first: *show how the answer thinks.* That means:

1. **Brute force first, with the reason it's slow made visible.** For
   example, the learner sees the nested loop re-checking the same pairs.
2. **The observation that unlocks the better approach**, taught as a moment
   rather than announced. For example: "We keep asking 'have I seen
   target − x?'. What answers that in one step?"
3. **Explanations that react to the current state.** Not "this line checks
   the map", but "7 needs a 2. The map holds {2: 0}, so the answer is
   indices 0 and 1."
4. **The pattern you leave with**, so the next problem is easier.

The competitors mostly animate. Almost none teach the reasoning, and none I
found tie each explanation to the actual values in the trace. That is the
gap, and it should drive every design decision below.

### Where I'm pushing back on the brief

| Brief says | My recommendation | Why |
|---|---|---|
| "Select **or enter** a LeetCode problem" | **Curated library only** for the MVP. Arbitrary problems come later, through the offline pipeline with review | Any problem on demand means AI-generated content at runtime, which breaks "correctness is non-negotiable." Five perfect problems beat 150 shaky ones (your words) |
| Show the problem statement | **Write our own plain-language statement and link to LeetCode.** Never copy their text | LeetCode's statements are their copyrighted content, and scraping is against their terms. Our plain version is also better teaching |
| Three columns: left, center, right | **Put the visualization at the center, with the explanation right beside it and the code next to that.** The step's explanation sits where the eyes already are | Spreading the explanation to a far column makes learners ping-pong across the screen. See §3.3 |
| Multi-language implied | **Python first for traced execution.** Show other languages later as read-only translations | Tracing must run the real code. Python can be traced exactly and safely in the browser (proven in §4.1). Each extra traced language is a separate engine |
| "Use dark and light only if they help" | **Ship both.** Light is the default, dark is a full design | Developers expect dark mode in a tool they use at night. It's cheap when designed in from the start |
| Name "LeetSee" | **Check the trademark before spending on branding** | It sits close to "LeetCode." The risk is low to medium, and it's cheap to check now and expensive later |

---

## 2. Repository audit

The repo currently holds **Pillow**: a Hono server on Node's built-in
SQLite, a React + Vite + TypeScript client, CodeMirror, Pyodide in a Web
Worker, and 75 Vitest tests. It is archived at tag `archive/pillow-v1`
(the earlier Nue project is at `archive/nue-v1`).

| Keep | Why |
|---|---|
| Vite + React + TypeScript | Fast, typed, and already set up. Right for an interactive client-heavy app |
| Pyodide in a Web Worker | Already proven here: it self-hosts the runtime, runs as a module worker, and has a timeout that kills runaway code. This becomes the live tracer |
| CodeMirror 6 | Read-only code pane with line decorations for the active line |
| Vitest | Unit and integration tests |
| The visual language (calm, one accent, system type) | It matches the brief's design direction |

| Drop | Why |
|---|---|
| Hono server, SQLite, admin | **The LeetSee MVP needs no backend.** Content is static, execution runs on the learner's device, and progress lives in local storage |
| Pillow's engine, content and screens | A different product |

Pillow's code leaves the working tree when LeetSee building starts. Git
history and the tag keep it.

---

## 3. Product design

### 3.1 Core journey

```
Home ──search──► Problem ──► 1 Understand ──► 2 Brute force ──► 3 Better approach ──► 4 Compare & pattern
                                 │                 │                    │
                                 │            watch it run         watch it run
                                 │           (why it's slow)     (why it's fast)
                                 └──── try your own input at any point (live trace) ────┘
```

Each chapter ends with a one-question check ("Which line makes this O(n²)?")
so the learner actively commits to an idea. It's optional and never graded.

### 3.2 Information architecture

- **Home:** search, recently explored, and problems grouped by *pattern*
  (Hashing, Two pointers, Sliding window, Stack, Linked list, Trees and
  recursion). Grouping by pattern teaches more than grouping by LeetCode
  number.
- **Problem workspace:** four chapters with the same layout throughout.
- **Comparison (chapter 4):** brute force against the better approach side
  by side, with operation counts from real traces, a growth chart, the
  trade-offs, and the reusable pattern.

### 3.3 Workspace layout

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Two Sum            1 Understand · 2 Brute force · 3 Hash map · 4 Compare     ⌘K │
├───────────────────────────────────────────────┬───────────────────────────────┤
│                                               │  1  def two_sum(nums, target):│
│   nums   [ 2 ][ 7 ][ 11 ][ 15 ]                │  2      seen = {}             │
│                 ▲ i                           │  3      for i, x in enumerate…│
│                                               │ ▶4      need = target - x     │
│   seen   { 2 → 0 }                            │  5      if need in seen:      │
│                                               │  …                            │
│   need = 9 − 7 = 2                            │                               │
│                                               │  i 1   x 7   need 2           │
│  ───────────────────────────────────────────  │                               │
│  7 needs a partner that adds to 9, which is 2.│  Line 4                       │
│  We'll look 2 up in seen next.                │  What: computes the value that│
│                                               │  would complete the pair…     │
│  ◀◀  ◀  ▶ Play  ▶  ▶▶      step 4 of 11   1×  │  Why: …  If removed: …        │
└───────────────────────────────────────────────┴───────────────────────────────┘
```

- **The visualization is the hero.** The step narration sits directly under
  it, so the eye moves down rather than across.
- **The code pane shows the active line and the variables**, with the
  line's full explanation (what, why, what it affects, what if removed)
  underneath.
- **Chapter 1 (Understand)** swaps the visualization for the plain-language
  statement and a hand-traced example. There's no code until chapter 2.
- **Keyboard first:** ←/→ to step, space to play, R to restart, ⌘K to
  search. Every control has a visible button too.
- **Desktop is the primary target.** On narrow screens it becomes one
  column (visualization, narration, controls), with code in a drawer.

---

## 4. Technical architecture

### 4.1 The spike that decides it

The central question: can we capture **real** execution, every line with
full state, safely, and at a predictable cost? I wrote a 60-line tracer
using Python's `sys.settrace` and ran it on Two Sum, Reverse Linked List and
a recursive function:

- **Standard Python (CPython) and Pyodide (in the browser) produced
  identical traces, step for step** (11/11, 21/21 and 16/16 steps), after
  one design fix: object ids must be stable sequential numbers, not memory
  addresses.
- It captures every line event, every stack frame's variables, and object
  identity. Reverse Linked List shows node 2's `next` flipping to node 1 on
  the exact step the code does it. Recursion depth shows up as stacked
  frames.
- It traced all three in **11 ms** in Pyodide.

That makes one architecture possible: **the same tracer runs at build time
(to precompute traces that load instantly) and in the browser (for custom
inputs).** One source of truth, with a parity test.

### 4.2 Options considered

| Approach | Faithful to real execution? | Semantic visuals (windows, pointers)? | Cost per problem | Verdict |
|---|---|---|---|---|
| Hand-written step generators per problem (what most visualizers do) | **No.** A second copy of the algorithm that can drift from the code shown | Yes | High, and duplicated | Rejected: it's the "fake functionality" the brief forbids |
| LLM-generated event sequences | No | Yes | Low | Rejected: fabricated by definition |
| Regex or text parsing | No | No | — | Rejected |
| AST instrumentation (rewrite the code to emit events) | Yes | Partial | Medium | Possible, but `settrace` gives the same fidelity without rewriting code |
| Generic tracer only (Python Tutor style: frames, boxes, arrows) | Yes | **No.** It can't know that `left..right` is a window | Low | Necessary but not sufficient |
| **Generic tracer + declarative visualization spec** | **Yes** | **Yes** | **Low: a small spec per approach** | **Chosen** |

### 4.3 The pipeline

```
 Problem content (typed, versioned)
   code · tests · line notes · visualization spec
        │
        ▼
 ┌──────────────┐   raw trace: per step → line, event, frames + locals,
 │   Tracer      │   heap graph with stable ids, return values
 │ sys.settrace  │   (CPython at build time · Pyodide in a worker at runtime)
 └──────┬───────┘
        ▼
 ┌──────────────┐   diff consecutive snapshots + line annotations →
 │  Interpreter  │   semantic events: pointer moved, map set, node.next
 │  (pure TS)    │   changed, push/pop, call/return, comparison…
 └──────┬───────┘
        ▼
 ┌──────────────┐   per step: what each view shows, what changed, the
 │  View model   │   narration rendered from templates against real values
 └──────┬───────┘
        ▼
 Renderers: Array · Pointers · Range/Window · HashMap · Set · Stack · Queue ·
            LinkedList · Tree · Graph · Grid/DP table · CallStack · Variables
        ▲
 Playback controller: play · pause · step ± · restart · speed · step over/into (recursion)
```

**Raw trace (from the tracer), roughly:**

```ts
type Step = {
  event: "call" | "line" | "return" | "exception";
  line: number;
  frames: { fn: string; line: number; locals: Record<string, Value> }[];
  heap: Record<HeapId, HeapObject>;  // list | dict | set | object fields
  returned?: Value;
};
type Value = null | boolean | number | string | { ref: HeapId };
```

**Visualization spec (written per approach, small and declarative).** For
example, the sliding window:

```ts
views: [
  { kind: "array", of: "s", pointers: ["left", "right"], range: ["left", "right"], rangeLabel: "window" },
  { kind: "map", of: "last_seen", label: "last seen at" },
  { kind: "vars", show: ["best"] },
],
lines: {
  6: { tag: "compare",
       narrate: "Is '{ch}' already inside the window? It was last seen at {last_seen[ch]}, and the window starts at {left}." },
}
```

The spec only says **how to show** real state. It can never invent state.
Narration templates use a tiny safe expression language (variable lookup,
indexing, arithmetic), never `eval`.

**Why diff snapshots instead of only rendering them?** Learners need to see
*what changed*. "`left` moved from 0 to 3 because 'a' repeats" is the
teaching moment. Diffs give the animation and the "why it changed" text the
same source.

### 4.4 Explanations

Two layers, both authored and validated:

1. **Line notes**, one per executable line: *what* it does, *why* it's
   needed, *what it affects*, and *what if we removed or changed it*.
   They're static, shown in the code pane.
2. **Step narration**: templates attached to lines (and optionally to
   conditions, such as "the lookup succeeded" vs "failed"), rendered against
   the current snapshot. Shown under the visualization.

The validator fails the build if any executable line lacks notes, or if any
template references a value that doesn't exist at some step of any
reference trace.

### 4.5 Execution and security

- **MVP: only our reviewed reference code runs.** Learners change the
  *input*, not the code.
- **Default traces are precomputed at build time** and shipped as JSON. The
  first visit has no Python download (Pyodide is about 13 MB) and loads
  instantly.
- **Custom inputs trace live in Pyodide inside a Web Worker on the learner's
  device.** Nothing executes on our server. Limits:
  - a step cap (3,000 steps, then stop with a clear message);
  - a wall-clock timeout that terminates the worker;
  - input-size caps per problem (visual traces are only useful for small
    inputs anyway);
  - no network or DOM access from the worker.
- **Later, learner-written code** uses the same sandbox. If server-side
  execution ever becomes necessary (for example, C++ or Java), it goes in a
  separate isolated sandbox (gVisor or Firecracker, or a hosted judge),
  never the app server. That's a later decision with its own ADR.

### 4.6 Complexity, from first principles and checked against reality

The tracer already counts executed lines. For each approach, the build runs
inputs of growing size and records operation counts. The validator fails if
the measured growth doesn't match the claimed class (for example, brute
force must grow about 4× when n doubles, the hash map about 2×). Chapter 4
shows those **real counts** as the growth chart. "O(n²)" then means
"here's how the step count actually grew as n went from 10 to 100", not a
label.

### 4.7 Stack

| Concern | Choice | Notes |
|---|---|---|
| Frontend | React + TypeScript + Vite | Already in the repo |
| Backend | **None in the MVP** | Static deploy. Add one when accounts or progress sync arrive |
| Database | None; local storage for recents and progress | |
| Execution | Python `sys.settrace`: CPython at build time, Pyodide Web Worker at runtime | Parity-tested |
| Visualization | SVG rendered by React, with CSS transitions and FLIP for reordering | No animation library until one earns its place |
| State | A reducer over `(trace, stepIndex)` with pure selectors | Playback is "derive view model for step i", so stepping back is free |
| Code pane | CodeMirror 6, read-only, active-line decoration | |
| Content | TypeScript modules with strict types, validated at build | Type errors catch broken specs |
| Tests | Vitest (tracer parity, interpreter, templates, content validation), Playwright for end-to-end flows | Playwright is the one new dependency, and worth it |
| Deploy | Static hosting (GitHub Pages is already set up, or Vercel) | |

---

## 5. AI strategy

**AI drafts, the pipeline verifies, a human approves. AI is never the
source of truth at runtime.**

```
 LLM draft                     Automatic gates (all must pass)                Human review   Publish
 ──────────                    ───────────────────────────────                ────────────   ───────
 plain statement        ──►    tests incl. edge cases pass on both approaches    read every    versioned
 brute + optimal code          brute vs optimal agree on 1,000 random inputs    note, watch   content
 test cases                    measured growth matches the claimed complexity   both traces   file
 line notes                    every executable line has notes
 visualization spec            every template resolves on every reference step
 narration templates           traces stay under step caps
```

- **Offline, not runtime.** Drafting a problem goes from days to hours.
  Learners only ever see reviewed content.
- **Differential testing** is the strongest correctness check: the obvious
  brute force is very likely right, so the optimized version must agree
  with it on random inputs.
- **Later, at runtime:** "Ask about this step." The model gets the current
  snapshot, the line, the notes and the spec, and must answer from that
  state. It's clearly marked as AI. It comes after the core is excellent.

---

## 6. The hardest engineering problems (ranked)

1. **Turning generic traces into semantic visuals.** Mapping `i` to "a
   pointer into `nums`", spotting a window, detecting a comparison. *Plan:*
   a declarative spec plus line annotations; snapshot diffing tested
   against hand-checked expectations for each MVP problem.
2. **Explanations that stay true on every step and every custom input.**
   *Plan:* templates evaluated against real state; the validator runs them
   over many random inputs, not just the example.
3. **Stable layouts for linked structures.** Trees and lists shouldn't jump
   around between steps. *Plan:* layout computed once per trace from all
   nodes that ever exist, with positions keyed by stable heap ids.
4. **Recursion verbosity.** A tree traversal can be hundreds of steps.
   *Plan:* step over and step into, collapsible call frames, and "jump to
   return."
5. **Making the brute-to-optimal moment land.** This is content craft as
   much as engineering. *Plan:* author the first two problems by hand to
   set the bar before using any AI drafting.
6. **Content throughput.** Each problem needs two approaches, line notes, a
   spec, narration and tests. *Plan:* the AI drafting pipeline after the MVP
   bar is set, gated by §5.
7. **Pyodide's first load for custom inputs.** *Plan:* precomputed default
   traces; load Pyodide lazily on the first "try your own input", with a
   visible progress state.

---

## 7. MVP

**Six problems, chosen to cover every core view and both kinds of state
change (values and pointers).** Swapping one of your eight for a recursion
problem tests the riskiest part of the architecture early.

| Problem | Brute force → better approach | Views it proves |
|---|---|---|
| Two Sum | Nested loops → hash map | Array, index pointers, **HashMap** |
| Valid Parentheses | Repeatedly delete "()" pairs → stack | String, **Stack** |
| Binary Search | Linear scan → halving | Array, **lo/mid/hi pointers**, shrinking range |
| Longest Substring Without Repeating Characters | Check every substring → sliding window | **Range/Window**, Map |
| Reverse Linked List | Copy values into a list, rebuild → re-point in place | **LinkedList, pointer rewiring** |
| Maximum Depth of Binary Tree *(swapped in)* | (single approach; recursive vs iterative BFS as the second) | **Tree, CallStack, recursion** |

**Next, cheap once the engine exists:** Maximum Subarray (brute O(n²) →
Kadane), Best Time to Buy and Sell Stock, Merge Two Sorted Lists. They
reuse the same views.

**Definition of done for each problem:**
- All four chapters written.
- Both approaches traced and visualized.
- Every executable line has notes.
- Narration is correct on the example and on 200+ random inputs.
- Complexity is verified by measured growth.
- Custom input works.
- It's checked by hand in the browser, in both themes, with the keyboard
  only.

**Out of the MVP:** accounts, a backend, learner-written code, AI at
runtime, C++/Java/JavaScript tracing, arbitrary problem entry, and
gamification.

---

## 8. Roadmap

Each milestone ends with a gate: a working, tested, inspected product
slice. Nothing moves forward on "should work."

| # | Milestone | What's built | Gate |
|---|---|---|---|
| M0 | **Engine core** | Tracer (stable ids, limits) with parity tests in CPython and Pyodide; trace types; build-time trace script | Identical traces for all 6 problems; step caps and timeouts enforced |
| M1 | **Interpreter and playback** | Snapshot diffing to semantic events; the spec format; template language; playback reducer | Hand-checked event expectations pass for Two Sum and Reverse Linked List; stepping back reproduces state exactly |
| M2 | **Renderers and workspace** | Array, Pointers, Range, Map, Set, Stack, LinkedList, Tree, CallStack and Vars views; the workspace layout; synced CodeMirror; controls; both themes | Two Sum and Reverse Linked List are fully watchable in the browser and checked with the keyboard |
| M3 | **The teaching layer** | The four-chapter flow; line notes; narration; the comparison chapter with real operation counts; the content validator | Two Sum and Reverse Linked List are complete to the definition of done. **This sets the quality bar** |
| M4 | **The rest of the MVP** | Valid Parentheses, Binary Search, Longest Substring, Max Depth (recursion: step over and into) | All 6 meet the definition of done |
| M5 | **Live input and polish** | Lazy Pyodide custom input, home and search, loading and error states, accessibility pass, Playwright end-to-end tests, deploy | A learner can open any MVP problem cold on a deployed URL and follow it end to end |
| M6 | **Content pipeline** | AI drafting with the §5 gates, used to author the next 3 problems | 3 new problems pass every gate and review |

---

## 9. Decisions I need from you

1. **The architecture:** a generic Python tracer plus declarative
   visualization specs, with traces precomputed at build time and run live
   in the browser for custom inputs. (Recommended; see the ADR.)
2. **Python-only execution for the MVP**, with other languages later.
3. **A curated library only for the MVP** (no "enter any problem").
4. **The MVP set:** the six above, with Maximum Depth of Binary Tree in
   place of Maximum Subarray and Merge Two Sorted Lists.
5. **Clearing Pillow from the working tree** when building starts (it's
   archived at `archive/pillow-v1`).
