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

test("search finds a problem and its film starts on its own @phone", async ({ page }) => {
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
  await expect(page.getByText("You get a string of brackets", { exact: false })).toBeVisible();
  // It plays without being asked: the first scene's progress moves, then the next scene arrives.
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Scene 2/ })).toHaveAttribute("aria-current", "step", { timeout: 20_000 });
  expect(errors).toEqual([]);
});

test("a film plays every scene, ends on the shelf, and the shelf shows it @phone", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("p/binary-search");
  const scenes = page.getByRole("button", { name: /^Scene \d+/ });
  const count = await scenes.count();
  expect(count).toBe(8);
  // Step through every scene with the keyboard; each one must render without errors.
  for (let i = 1; i < count; i++) {
    await page.keyboard.press("ArrowRight");
    await expect(scenes.nth(i)).toHaveAttribute("aria-current", "step");
  }
  await expect(page.getByRole("heading", { name: "Binary search: halve the possibilities" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Explain Another" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Saved to Shelf" })).toBeVisible();
  await page.getByRole("button", { name: "Explain Another" }).click();
  await expect(page.getByRole("heading", { name: "Shelf" })).toBeVisible();
  await expect(page.locator(".shelf-row")).toContainText("Binary Search");
  await page.getByRole("button", { name: "Remove Binary Search from Shelf" }).click();
  await expect(page.getByText("Films you watch are saved here.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("a run scene shows the real trace, and the code on request", async ({ page }) => {
  await page.goto("p/two-sum");
  await page.getByRole("button", { name: /Scene 6: Watch: Hash map/ }).click();
  await expect(page.locator(".step-count")).toHaveText(/^Step \d+ of \d+/);
  await page.getByRole("button", { name: "Show code (C)" }).click();
  await expect(page.locator(".sc-code")).toContainText("def two_sum(nums, target):");
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
});

test("a problem that isn't ready yet says honestly that new problems need the server", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("combobox").fill("Merge Intervals");
  await page.getByRole("combobox").press("Enter");
  await expect(page).toHaveURL(/\/explain\?q=Merge%20Intervals/);
  await expect(page.getByText("Explaining new problems needs Pillow’s server", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Choose a Ready Film" }).click();
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

test("films and lesson pages never scroll sideways on a phone @phone", async ({ page }) => {
  for (const p of PROBLEMS) {
    await page.goto(`p/${p.slug}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${p.slug} film`).toBeLessThanOrEqual(0);
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
