import { expect, type Page, test } from "@playwright/test";
import { chaptersOf } from "../src/workspace/chapters";
import { PROBLEMS } from "../src/content/problems";

/** Fail the test on any uncaught error or console error. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return errors;
}

test("search finds a problem and its playground starts racing on its own @phone", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "Pillow" })).toBeVisible();
  const ask = page.getByRole("combobox");
  await expect(ask).toBeFocused();
  await ask.fill("valid par");
  await expect(page.getByRole("option", { name: /Valid Parentheses/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /Explain “valid par”/ })).toBeVisible();
  await ask.press("Enter");
  await expect(page).toHaveURL(/\/pillow\/p\/valid-parentheses$/);
  // Both approaches race on the same input, without being asked.
  await expect(page.getByRole("article", { name: "Delete pairs" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Stack" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(page.locator(".lane-count strong").first()).not.toHaveText("1", { timeout: 5_000 });
  expect(errors).toEqual([]);
});

test("changing the input re-runs both approaches in real Python @phone", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("p/two-sum");
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
  await page.goto("p/binary-search");
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
  await page.goto("p/maximum-depth-of-binary-tree");
  const totals = page.locator(".lane-count span");
  const before = (await totals.allTextContents()).join();
  await page.getByRole("button", { name: "Add a node here" }).nth(2).click();
  await expect(page.locator(".tree-ed .tnode:not(.ghost)")).toHaveCount(6);
  await expect.poll(async () => (await totals.allTextContents()).join(), { timeout: 45_000 }).not.toBe(before);
  // Tapping a node prunes it.
  await page.getByRole("button", { name: /^Node 9: remove it/ }).click();
  await expect(page.locator(".tree-ed .tnode:not(.ghost)")).toHaveCount(5);
});

test("drag time to the end: the race finishes and lands on the shelf @phone", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("p/binary-search");
  const time = page.getByRole("slider", { name: /^Time/ });
  await time.fill(await time.getAttribute("max") ?? "0");
  await expect(page.locator(".lane.done")).toHaveCount(2);
  await expect(page.locator(".lane.winner")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Saved to Shelf" })).toBeVisible();
  await page.getByRole("button", { name: "Back to search" }).click();
  await expect(page.locator(".shelf-row")).toContainText("Binary Search");
  await page.getByRole("button", { name: "Remove Binary Search from Shelf" }).click();
  await expect(page.getByText("Problems you play with are saved here.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("the size slider shows the gap grow, with real numbers", async ({ page }) => {
  await page.goto("p/two-sum");
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
    await page.goto(`p/${p.slug}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${p.slug} playground`).toBeLessThanOrEqual(0);
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
