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

test("home lists every problem and opens one @phone", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("./");
  for (const p of PROBLEMS) await expect(page.getByText(p.title, { exact: true })).toBeVisible();
  await page.getByText("Two Sum", { exact: true }).click();
  await expect(page).toHaveURL(/\/pillow\/p\/two-sum/);
  await expect(page.getByRole("heading", { name: "Two Sum" })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const problem of PROBLEMS) {
  test(`${problem.title}: every chapter opens from a deep link`, async ({ page }) => {
    const errors = watchErrors(page);
    for (const c of chaptersOf(problem)) {
      await page.goto(`p/${problem.slug}?chapter=${c.id}`);
      await expect(page.getByRole("button", { name: new RegExp(c.label) }).first()).toHaveAttribute("aria-current", "page");
      await expect(page.locator("article.chapter, .player").first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}

test("the player steps, jumps to the end, and shows the real result", async ({ page }) => {
  await page.goto("p/two-sum?chapter=hash-map");
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
  await page.goto("p/two-sum?chapter=hash-map");
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
  await page.goto("p/binary-search?chapter=halving");
  await page.getByRole("button", { name: "Try your own input" }).click();
  await page.getByLabel("nums").fill("[1, 5, 3]");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByText("The list must be sorted: 5 comes before 3.")).toBeVisible();
  await expect(page.getByLabel("nums")).toHaveAttribute("aria-invalid", "true");
});

test("an edge case can be picked in one click", async ({ page }) => {
  await page.goto("p/maximum-depth-of-binary-tree?chapter=recursion");
  await page.getByRole("button", { name: "Try your own input" }).click();
  await page.getByRole("button", { name: "root = []" }).click();
  await expect(page.getByText("Starting with root = []")).toBeVisible({ timeout: 45_000 });
  await page.keyboard.press("End");
  await expect(page.locator(".story")).toContainText("Returned 0");
});

test("lesson pages never scroll sideways on a phone @phone", async ({ page }) => {
  for (const p of PROBLEMS) {
    for (const c of chaptersOf(p)) {
      await page.goto(`p/${p.slug}?chapter=${c.id}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow, `${p.slug} / ${c.id}`).toBeLessThanOrEqual(0);
    }
  }
});

test("an unknown address says so and links home", async ({ page }) => {
  await page.goto("p/not-a-problem");
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  await page.getByRole("link", { name: "See all problems" }).click();
  await expect(page.getByText("Two Sum", { exact: true })).toBeVisible();
});
