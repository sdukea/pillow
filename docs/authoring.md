# Adding a problem with the AI drafting pipeline

You write a short brief. Claude drafts the lesson. The pipeline checks it,
and you review it and publish it. The reasoning behind each step is in
[ADR 0007](adr/0007-ai-drafting-pipeline.md).

## 1. Write the brief

Create `content/briefs/<slug>.json`. The slug matches LeetCode's URL.
[`contains-duplicate.json`](../content/briefs/contains-duplicate.json) is
a complete example.

| Field | What to put |
|---|---|
| `slug`, `title`, `leetcode` | As on LeetCode |
| `pattern` | One of the patterns in `src/content/problems.ts` (`PATTERNS`) |
| `statement` | The problem in your own words |
| `entry` | The function name every solution defines, e.g. `contains_duplicate` |
| `inputs` | One field per parameter: `name`, `type` (`int`, `int-list`, `string`, `tree`, `linked-list`), `min`/`max` (sizes learners may type), optional `hint` and `rule` (`sorted-unique`, `brackets-only`) |
| `examples` | At least two, as plain values (one per field) with the `expected` output. **These are the ground truth; get them right.** Trees and linked lists are value lists, like `[3, 9, 20, null, null, 15, 7]`. |
| `precondition` | Optional. LeetCode's guarantee about inputs, as Python defining `valid(...)`, e.g. "exactly one pair adds up to target". Random test inputs must satisfy it. |
| `guidance` | Optional. Anything the drafter should know, e.g. which first approach to teach. |

## 2. Draft

Needs an Anthropic API key (`ANTHROPIC_API_KEY`, or `ant auth login`) and
Node 25 or later.

```bash
npm run draft -- contains-duplicate
```

This checks your brief, then asks Claude for a draft and runs the five
checks: shape, examples, agreement, visualization and lesson. It sends any
failures back to Claude, for up to three attempts. Each attempt and its
report are saved in `content/drafts/<slug>/` (not committed). Nothing is
published.

## 3. Review

Read `content/drafts/<slug>/draft.json` as a learner would. The checks
already proved the solutions agree with your examples and with each other,
that every running line is explained and narrated, and that the complexity
claims match measurements. Your job is what they can't check:

- Is the first approach the one a beginner would actually try?
- Do the explanations teach, in plain language, without errors?
- Does the "why it works" reasoning hold up?
- Are the edge cases the interesting ones?

You can edit the draft directly. Promotion re-runs every check.

## 4. Publish

```bash
npm run promote -- contains-duplicate --reviewer "Your Name"
```

```bash
npm run traces
```

```bash
npm test
```

Promotion refuses unless every check passes and a reviewer is named. It
writes the solutions to `engine/tracer/fixtures/` and the lesson to
`src/content/library/<slug>.json`, and regenerates the library index.
Commit those files. The lesson shows that it was drafted with AI and who
reviewed it.
