import { expect, type Page, test } from "@playwright/test";
import { chaptersOf } from "../src/workspace/chapters";
import { PROBLEMS } from "../src/content/problems";

// Runs play at reading speed for people; here they play 40× faster so the suite stays quick.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("pillow.speed", "40"); } catch { /* not every page allows storage */ } });
});

/** Fail the test on any uncaught error or console error. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return errors;
}

/** Answer whatever question is on screen with its first choice; returns the question text. */
async function answerFirst(page: Page) {
  const card = page.locator(".ask-card");
  await expect(card).toBeVisible({ timeout: 40_000 });
  const prompt = await card.locator(".ask-prompt").innerText();
  await card.locator(".choice").first().click();
  await expect(page.locator(".ask-verdict").first()).toBeVisible();
  return prompt;
}

/** Play a run beat to the end: its prediction, then its growth question. */
async function finishRun(page: Page) {
  await answerFirst(page); // the prediction
  await expect(page.getByText("If the input were twice as long", { exact: false })).toBeVisible({ timeout: 40_000 });
  await page.locator(".ask-card .choice").first().click();
  await expect(page.locator(".learn-next .next")).toBeEnabled();
}

/** Work through "Your turn": try choices in order until each question is answered right. */
async function solveThink(page: Page) {
  const think = page.locator(".think");
  await expect(think).toBeVisible();
  for (;;) {
    const choices = think.locator(".choice:not([disabled])");
    while (!(await think.locator(".think-reply.right").isVisible())) await choices.first().click();
    const more = page.getByRole("button", { name: "Next Question" });
    if (await more.isVisible()) await more.click();
    else break;
  }
  await expect(page.locator(".learn-next .next")).toBeEnabled();
}

test("a problem asks before it tells: predict, then say how it grows, then the note @phone", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("./");
  const ask = page.getByRole("combobox");
  await expect(ask).toBeFocused();
  await ask.fill("valid par");
  await expect(page.getByRole("option", { name: /Valid Parentheses/ })).toBeVisible();
  await ask.press("Enter");
  await expect(page).toHaveURL(/\/pillow\/p\/valid-parentheses$/);
  // It opens on what the problem teaches, with where you stand on each concept.
  await expect(page.getByRole("heading", { name: "What this problem teaches" })).toBeVisible();
  await expect(page.locator(".teach-row").filter({ hasText: "Stacks" })).toContainText("New");
  await page.getByRole("button", { name: "Start With the Slow Way" }).click();
  // Every marker on screen is explained, and the run can be stepped through.
  await expect(page.locator(".legend")).toContainText("the brackets still left; matched pairs get deleted");
  await expect(page.getByRole("button", { name: "Step forward" })).toBeVisible();
  // The run stops to ask; moving on is locked until you answer.
  await expect(page.locator(".ask-card")).toBeVisible({ timeout: 40_000 });
  await expect(page.locator(".learn-next .next")).toBeDisabled();
  await expect(page.locator(".learn-next .next")).toHaveText("Answer to Continue");
  await finishRun(page);
  await expect(page.getByText("Every deletion restarts the scan from the beginning.")).toBeVisible();
  await page.getByRole("button", { name: "Your Turn" }).click();
  await expect(page.locator(".learn-next .next")).toBeDisabled();
  await solveThink(page);
  await page.getByRole("button", { name: "Put It Together" }).click();
  await expect(page.getByText("The last bracket opened must be the first one closed. That’s a stack.")).toBeVisible();
  await page.getByRole("button", { name: "Watch It Work" }).click();
  await finishRun(page);
  await expect(page.getByText(/steps → \d+ here\. At 128 items/)).toBeVisible();
  await page.getByRole("button", { name: "Write It Yourself" }).click();
  await page.getByRole("button", { name: "Skip for Now" }).click();
  await expect(page.getByRole("article", { name: "Your note" })).toContainText("Things that open and close in order? Use a stack.");
  await page.getByRole("button", { name: "Done" }).click();
  // Every answer was recorded as evidence.
  const tasks: string[] = await page.evaluate(() => JSON.parse(localStorage.getItem("pillow.evidence") ?? "[]").map((e: { task: string }) => e.task));
  expect(tasks.filter((t) => t === "predict")).toHaveLength(2);
  expect(tasks.filter((t) => t === "complexity")).toHaveLength(2);
  expect(tasks.filter((t) => t === "exposure")).toHaveLength(2);
  expect(tasks.filter((t) => t === "reason")).toHaveLength(2); // only the first answer to each question counts
  expect(errors).toEqual([]);
});

test("every problem walks through all five steps without errors", async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchErrors(page);
  for (const p of PROBLEMS) {
    await page.goto(`p/${p.slug}`);
    await page.locator(".learn-next .next").click();
    await finishRun(page);
    await page.locator(".learn-next .next").click();
    await solveThink(page);
    await page.locator(".learn-next .next").click();
    await page.locator(".learn-next .next").click();
    await finishRun(page);
    await page.locator(".learn-next .next").click(); // to "Write it yourself"
    await page.locator(".learn-next .next").click(); // skip for now
    await expect(page.getByRole("article", { name: "Your note" })).toContainText(p.lesson!.card.trick);
  }
  expect(errors).toEqual([]);
});

test("the map changes because of what you answered, never because you watched", async ({ page }) => {
  await page.goto("p/binary-search");
  await page.locator(".learn-next .next").click();
  await finishRun(page);
  await page.goto("map");
  await expect(page.locator(".cl-group h2").filter({ hasText: /Needs work|Learning/ }).first()).toBeVisible();
  await page.getByRole("button", { name: /^Arrays: / }).click();
  const panel = page.locator(".concept");
  await expect(panel).toContainText("Arrays");
  await expect(panel.locator(".evidence li").first()).toBeVisible();
  await expect(panel).toContainText("Binary Search");
  await expect(panel.getByRole("button", { name: "Binary Search" })).toBeVisible();
  // Nothing becomes understood in one sitting.
  await expect(page.locator(".map-node.understood")).toHaveCount(0);
});

test("a note asks you to recall the trick, and the answer becomes evidence", async ({ page }) => {
  await page.goto("p/two-sum");
  await page.getByRole("button", { name: "Start With the Slow Way" }).click();
  await finishRun(page);
  await page.getByRole("button", { name: "Your Turn" }).click();
  await solveThink(page);
  await page.getByRole("button", { name: "Put It Together" }).click();
  await page.getByRole("button", { name: "Watch It Work" }).click();
  await finishRun(page);
  await page.getByRole("button", { name: "Write It Yourself" }).click();
  await page.getByRole("button", { name: "Skip for Now" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: /What’s the trick\? Recall it/ }).click();
  await page.getByRole("button", { name: "Remember each number you pass. Then ask: is my partner already here?" }).click();
  await expect(page.locator(".note-body")).toContainText("Right.");
  const recall: { correct: boolean }[] = await page.evaluate(() => JSON.parse(localStorage.getItem("pillow.evidence") ?? "[]").filter((e: { task: string }) => e.task === "recall"));
  expect(recall).toHaveLength(1);
  expect(recall[0].correct).toBe(true);
});

test("your turn: hints weaken the evidence, a wrong answer explains itself, and the misconception reaches the map", async ({ page }) => {
  await page.goto("p/two-sum");
  await page.getByRole("button", { name: "Start With the Slow Way" }).click();
  await finishRun(page);
  await page.getByRole("button", { name: "Your Turn" }).click();
  // Question 1: take a hint first, then answer right. The answer is recorded as hinted.
  await page.getByRole("button", { name: /^Hint/ }).click();
  await expect(page.locator(".hints li")).toHaveText("Take 2 and a target of 9. Which numbers would complete the sum?");
  await page.getByRole("button", { name: "One exact partner: the target minus itself." }).click();
  await expect(page.locator(".think-reply.right")).toBeVisible();
  await page.getByRole("button", { name: "Next Question" }).click();
  // Question 2: answer wrong first. The reply addresses the misconception; then find the right one.
  await page.getByRole("button", { name: "A hash map wouldn’t help: it has to check all its keys too." }).click();
  await expect(page.locator(".think-reply.wrong")).toContainText("A hash map jumps straight to where a key would be");
  await expect(page.locator(".learn-next .next")).toBeDisabled();
  await page.getByRole("button", { name: "Remember every number you pass in a hash map, and look the partner up." }).click();
  await expect(page.locator(".learn-next .next")).toBeEnabled();
  const reasons: { correct: boolean; hinted: boolean; misconception?: string }[] = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pillow.evidence") ?? "[]").filter((e: { task: string }) => e.task === "reason"));
  expect(reasons).toEqual([
    expect.objectContaining({ correct: true, hinted: true }),
    expect.objectContaining({ correct: false, misconception: "lookup-scans" }),
  ]);
  await page.goto("map");
  await page.getByRole("button", { name: /^Instant lookup: Needs work/ }).click();
  await expect(page.locator(".concept")).toContainText("You seemed to think looking something up in a hash map means scanning every key.");
  await page.goto("./");
  await expect(page.locator(".home-next .next-row")).toContainText("Fix");
  await expect(page.locator(".home-next .next-row")).toContainText("You seemed to think");
});

/** Walk a problem up to "Write it yourself". */
async function toSolve(page: Page, slug: string) {
  await page.goto(`p/${slug}`);
  await page.locator(".learn-next .next").click();
  await finishRun(page);
  await page.locator(".learn-next .next").click();
  await solveThink(page);
  await page.locator(".learn-next .next").click();
  await page.locator(".learn-next .next").click();
  await finishRun(page);
  await page.getByRole("button", { name: "Write It Yourself" }).click();
  await expect(page.getByRole("textbox", { name: "Your solution, in Python" })).toBeVisible();
}

const implementEvidence = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("pillow.evidence") ?? "[]").filter((e: { task: string }) => e.task === "implement"));

test("write it yourself: a wrong solution shows the difference and can be stepped through; a right one is checked for speed @phone", async ({ page }) => {
  const errors = watchErrors(page);
  await toSolve(page, "two-sum");
  const editor = page.getByRole("textbox", { name: "Your solution, in Python" });
  await expect(editor).toHaveValue("def two_sum(nums, target):\n    ");
  await expect(page.locator(".learn-next .next")).toHaveText("Skip for Now");
  // A bug: returns the numbers instead of their indices.
  await editor.fill("def two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [target - x, x]\n        seen[x] = i\n    return []\n");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.locator(".solve-summary")).toContainText("cases pass", { timeout: 45_000 });
  const fail = page.locator(".case.fail").first();
  await expect(fail.locator(".case-diff")).toContainText("Expected");
  await fail.getByRole("button", { name: "Step through it" }).click();
  await expect(page.locator(".debugger")).toBeVisible();
  await expect(page.locator(".debugger .code-pane")).toContainText("def two_sum");
  // Fixed.
  await editor.fill("def two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [seen[target - x], i]\n        seen[x] = i\n    return []\n");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.locator(".solve-summary.good")).toContainText("as fast as the trick", { timeout: 45_000 });
  await expect(page.locator(".learn-next .next")).toHaveText("Keep the Note");
  expect(await implementEvidence(page)).toEqual([expect.objectContaining({ correct: true, hinted: false, problem: "two-sum" })]);
  expect(errors).toEqual([]);
});

test("write it yourself: brute force passes but is told it isn't the trick; peeking makes it practice", async ({ page }) => {
  await toSolve(page, "two-sum");
  const editor = page.getByRole("textbox", { name: "Your solution, in Python" });
  await page.getByRole("button", { name: "Show a solution" }).click();
  await expect(page.getByLabel("A solution")).toContainText("seen = {}");
  await editor.fill("def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return []\n");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.locator(".solve-summary.warn")).toContainText("grows like O(n²). The trick makes it O(n).", { timeout: 45_000 });
  await expect(page.locator(".solve-summary")).toContainText("counts as practice");
  expect(await implementEvidence(page)).toEqual([expect.objectContaining({ correct: false, hinted: true })]);
});

test("write it yourself: syntax errors point at the line", async ({ page }) => {
  await toSolve(page, "valid-parentheses");
  await page.getByRole("textbox", { name: "Your solution, in Python" }).fill("def is_valid(s):\n    return s ==\n");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.locator(".case-error").first()).toContainText("Line 2: SyntaxError", { timeout: 45_000 });
});

test("the overview links each concept to its reference card on the map", async ({ page }) => {
  await page.goto("p/two-sum");
  await page.locator(".teach-row").filter({ hasText: "Hash maps" }).click();
  await expect(page).toHaveURL(/\/map\?c=hash-map$/);
  const card = page.locator(".concept");
  await expect(card.getByRole("heading", { name: "Hash maps" })).toBeVisible();
  await expect(card).toContainText("Adding, finding and removing a key take about one step on average.");
  await expect(card).toContainText("Use it when");
  await card.getByRole("button", { name: "Two Sum" }).click();
  await expect(page).toHaveURL(/\/p\/two-sum$/);
});

test("stepping through a run shows each step's explanation, one at a time", async ({ page }) => {
  await page.goto("p/two-sum");
  await page.getByRole("button", { name: "Start With the Slow Way" }).click();
  await page.getByRole("button", { name: "Pause" }).click();
  const explain = page.locator(".explain");
  const count = page.locator(".stepper .step-count");
  const before = await count.innerText();
  await page.getByRole("button", { name: "Step forward" }).click();
  await expect(count).not.toHaveText(before);
  await expect(explain).not.toHaveText(" ");
  await page.getByRole("button", { name: "Step back" }).click();
  await expect(count).toHaveText(before);
});

test("a new student is told where to start, and the next step moves on as they learn", async ({ page }) => {
  await page.goto("./");
  const next = page.locator(".home-next .next-row");
  await expect(next).toContainText("Start here");
  await next.click();
  await page.locator(".learn-next .next").click();
  await finishRun(page);
  await page.goto("./");
  await expect(page.locator(".home-next .next-row")).not.toContainText("Start here");
  await expect(page.getByRole("button", { name: /^Your map/ })).toContainText("learning");
});

test("changing the input re-runs both approaches in real Python @phone", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("p/two-sum/play");
  const totals = page.locator(".lane-count span");
  const before = await totals.allTextContents();
  // Raise the 2 (index 4) to 3 with the keyboard: same as dragging it up a notch.
  await page.getByRole("button", { name: /^Item 5: 2\./ }).press("ArrowUp");
  await expect(page.getByRole("button", { name: /^Item 5: 3\./ })).toBeVisible();
  await expect.poll(async () => (await totals.allTextContents()).join(), { timeout: 45_000 }).not.toBe(before.join());
  // Undo puts it back, and the example's traces return instantly.
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: /^Item 5: 2\./ })).toBeVisible();
  await expect.poll(async () => (await totals.allTextContents()).join()).toBe(before.join());
  expect(errors).toEqual([]);
});

test("a sorted input stays sorted while you play with it", async ({ page }) => {
  await page.goto("p/binary-search/play");
  const first = page.getByRole("button", { name: /^Item 1: 1\./ });
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: /^Item 1: / }).press("ArrowUp");
  await page.getByRole("button", { name: /^Item 2: / }).focus();
  const values = await page.locator(".ed-cell:not(.ed-add)").allTextContents();
  const nums = values.map(Number);
  expect(nums).toEqual([...nums].sort((a, b) => a - b));
  expect(new Set(nums).size).toBe(nums.length);
  await expect(first).toHaveCount(0);
});

test("a tree grows where you tap, and both approaches re-run on it", async ({ page }) => {
  await page.goto("p/maximum-depth-of-binary-tree/play");
  const totals = page.locator(".lane-count span");
  const before = (await totals.allTextContents()).join();
  await page.getByRole("button", { name: "Add a node here" }).nth(2).click();
  await expect(page.locator(".tree-ed .tnode:not(.ghost)")).toHaveCount(6);
  await expect.poll(async () => (await totals.allTextContents()).join(), { timeout: 45_000 }).not.toBe(before);
  // Tapping a node prunes it.
  await page.getByRole("button", { name: /^Node 9: remove it/ }).click();
  await expect(page.locator(".tree-ed .tnode:not(.ghost)")).toHaveCount(5);
});

test("drag time to the end: the race finishes and keeps the note @phone", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("p/binary-search/play");
  const time = page.getByRole("slider", { name: /^Time/ });
  await time.fill(await time.getAttribute("max") ?? "0");
  await expect(page.locator(".lane.done")).toHaveCount(2);
  await expect(page.locator(".lane.winner")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Saved to Notes" })).toBeVisible();
  await page.goto("./");
  await expect(page.locator(".note-title")).toContainText("Binary Search");
  expect(errors).toEqual([]);
});

test("the size slider shows the gap grow, with real numbers", async ({ page }) => {
  await page.goto("p/two-sum/play");
  const n = page.getByRole("slider", { name: "Input size" });
  await n.fill("4");
  await expect(page.locator(".grow-n strong")).toHaveText("128");
  await expect(page.locator(".grow-num").first()).toHaveText("16,510");
  await expect(page.locator(".grow-ratio")).toHaveText("×32");
});

test("a problem that isn't ready yet says honestly that new problems need the server", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("combobox").fill("Merge Intervals");
  await page.getByRole("combobox").press("Enter");
  await expect(page).toHaveURL(/\/explain\?q=Merge%20Intervals/);
  await expect(page.getByText("Explaining new problems needs Pillow’s server", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Choose a Ready Problem" }).click();
  await expect(page.getByRole("combobox")).toBeVisible();
});

for (const problem of PROBLEMS) {
  test(`${problem.title}: every lesson chapter opens from a deep link`, async ({ page }) => {
    const errors = watchErrors(page);
    for (const c of chaptersOf(problem)) {
      await page.goto(`p/${problem.slug}/lesson?chapter=${c.id}`);
      await expect(page.getByRole("button", { name: new RegExp(c.label) }).first()).toHaveAttribute("aria-current", "page");
      await expect(page.locator("article.chapter, .player").first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}

test("the player steps, jumps to the end, and shows the real result", async ({ page }) => {
  await page.goto("p/two-sum/lesson?chapter=hash-map");
  const counter = page.locator(".controls .count");
  await expect(counter).toHaveText(/^1 \//);
  await page.getByRole("button", { name: /Forward one step/ }).click();
  await expect(counter).toHaveText(/^2 \//);
  await page.keyboard.press("End");
  await expect(page.locator(".result, .narration.final").first()).toBeVisible();
  await expect(page.locator(".story")).toContainText("Returned [4, 5]");
});

test("a custom input runs in Python in the browser, on every approach @phone", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("p/two-sum/lesson?chapter=hash-map");
  await page.getByRole("button", { name: "Try your own input" }).click();
  await page.getByLabel("nums").fill("[4, 9, 1, 6, 5]");
  await page.getByLabel("target").fill("11");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.locator(".example")).toHaveText("nums = [4, 9, 1, 6, 5], target = 11");
  // Python loads on first use; give it time, then check the real answer.
  await expect(page.getByText(/^Starting with nums = \[4, 9, 1, 6, 5\]/)).toBeVisible({ timeout: 45_000 });
  await page.keyboard.press("End");
  await expect(page.locator(".story")).toContainText("Returned [3, 4]");

  // The same input carries over to the other approach.
  await page.getByRole("button", { name: /Brute force/ }).first().click();
  await expect(page.locator(".example")).toHaveText("nums = [4, 9, 1, 6, 5], target = 11");
  await expect(page.getByText(/^Starting with nums = \[4, 9, 1, 6, 5\]/)).toBeVisible();
  await page.keyboard.press("End");
  await expect(page.locator(".story")).toContainText("Returned [3, 4]");

  await page.getByRole("button", { name: "Back to the example" }).click();
  await expect(page.locator(".example")).toHaveText(PROBLEMS[0].exampleLabel);
  expect(errors).toEqual([]);
});

test("bad input is explained, and nothing runs", async ({ page }) => {
  await page.goto("p/binary-search/lesson?chapter=halving");
  await page.getByRole("button", { name: "Try your own input" }).click();
  await page.getByLabel("nums").fill("[1, 5, 3]");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByText("The list must be sorted: 5 comes before 3.")).toBeVisible();
  await expect(page.getByLabel("nums")).toHaveAttribute("aria-invalid", "true");
});

test("an edge case can be picked in one click", async ({ page }) => {
  await page.goto("p/maximum-depth-of-binary-tree/lesson?chapter=recursion");
  await page.getByRole("button", { name: "Try your own input" }).click();
  await page.getByRole("button", { name: "root = []" }).click();
  await expect(page.getByText("Starting with root = []")).toBeVisible({ timeout: 45_000 });
  await page.keyboard.press("End");
  await expect(page.locator(".story")).toContainText("Returned 0");
});

test("playgrounds and lesson pages never scroll sideways on a phone @phone", async ({ page }) => {
  for (const p of PROBLEMS) {
    for (const path of [`p/${p.slug}`, `p/${p.slug}/play`]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), path).toBeLessThanOrEqual(0);
    }
    for (const c of chaptersOf(p)) {
      await page.goto(`p/${p.slug}/lesson?chapter=${c.id}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow, `${p.slug} / ${c.id}`).toBeLessThanOrEqual(0);
    }
  }
});

test("an unknown address says so and links home", async ({ page }) => {
  await page.goto("somewhere/else");
  await expect(page.getByRole("heading", { name: "Not Found" })).toBeVisible();
  await page.getByRole("link", { name: "Search for a problem" }).click();
  await expect(page.getByRole("combobox")).toBeVisible();
});

test("the roadmap starts at week 1, opens built lessons, and links planned problems to LeetCode @phone", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: /Your 16-week roadmap/ }).click();
  await expect(page.getByRole("heading", { name: "Roadmap" })).toBeVisible();
  await expect(page.getByText(/Week 1 of 16 · 205 problems/)).toBeVisible();
  const week1 = page.locator(".rm-week.now");
  await expect(week1.getByText("Arrays and hashing")).toBeVisible();
  const planned = week1.getByRole("link", { name: /Contains Duplicate/ });
  await expect(planned).toHaveAttribute("href", "https://leetcode.com/problems/contains-duplicate/");
  await page.getByRole("tab", { name: "All tiers" }).click();
  await expect(page.locator(".rm-row")).not.toHaveCount(75);
  await week1.getByRole("button", { name: "Hash maps", exact: true }).click();
  await expect(page).toHaveURL(/map\?c=hash-map/);
  await page.goBack();
  await page.locator(".rm-next").click();
  await expect(page).toHaveURL(/\/p\/two-sum$/);
});

test("a concept's card shows what you've shown, one dimension at a time @phone", async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    const H = 3_600_000, now = Date.now();
    const e = (at: number, task: string, correct: boolean, problem = "two-sum") => ({ at: now - at * H, task, problem, concepts: ["hash-map"], correct, detail: `${task} on ${problem}` });
    localStorage.setItem("pillow.evidence", JSON.stringify([e(20, "predict", true), e(19, "complexity", true), e(1, "implement", false)]));
  });
  await page.goto("map?c=hash-map");
  const card = page.locator(".concept");
  await expect(card.getByRole("heading", { name: "What you’ve shown" })).toBeVisible();
  const level = (name: string) => card.locator(".dim").filter({ hasText: name }).locator(".dim-level");
  await expect(level("Met it")).toHaveText("Solid");
  await expect(level("Spot it")).toHaveText("Not yet");
  await expect(level("Explain it")).toHaveText("Solid");
  await expect(level("Write it")).toHaveText("Not yet");
  await expect(level("Use it elsewhere")).toHaveText("Started");
  await expect(level("Keep it")).toHaveText("Started"); // right answers only an hour apart: never kept across sessions
  expect(errors).toEqual([]);
});

test("the placement check finds a starting week from right answers only, and the roadmap starts there @phone", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("./");
  await page.getByRole("button", { name: /Already know some of this/ }).click();
  await expect(page.getByRole("heading", { name: "Find your starting week" })).toBeVisible();
  const answer = async (text: string, verdict: string) => {
    await page.getByRole("button", { name: text }).click();
    await expect(page.locator(".ask-verdict")).toHaveText(verdict);
    await page.getByRole("button", { name: "Continue" }).click();
  };
  await answer("A set of the values seen so far", "Right.");
  await answer("A pointer at each end, moving inwards", "Right.");
  await answer("Sort the characters first", "Not quite.");
  await expect(page.getByText("A second chance on this week")).toBeVisible();
  await answer("prefix[5] − prefix[2]", "Not quite.");
  await expect(page.getByRole("heading", { name: "Week 3: Sliding windows and running totals" })).toBeVisible();
  const recorded = await page.evaluate(() => JSON.parse(localStorage.getItem("pillow.evidence") ?? "[]").map((e: { task: string; week: number }) => `${e.task}:${e.week}`));
  expect(recorded).toEqual(["diagnostic:1", "diagnostic:2"]);
  await page.getByRole("button", { name: "Open Your Roadmap" }).click();
  await expect(page.getByText(/Week 3 of 16/)).toBeVisible();
  await expect(page.locator(".rm-next")).toContainText("Longest Substring Without Repeating Characters");
  // Home no longer offers the check, and follows the roadmap.
  await page.goto("./");
  await expect(page.getByRole("button", { name: /Already know some of this/ })).toHaveCount(0);
  await expect(page.locator(".home-next .next-row")).toContainText("Longest Substring");
  expect(errors).toEqual([]);
});

test("a beginner can stop the placement check at once, and starts at week 1", async ({ page }) => {
  await page.goto("placement");
  await page.getByRole("button", { name: "I haven’t learned this yet" }).click();
  await expect(page.getByRole("heading", { name: "Week 1: Arrays and hashing" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("pillow.evidence"))).toBeNull();
});
