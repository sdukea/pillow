import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the production build, served under the same base path as
// GitHub Pages, so what's tested is what's deployed.
const BASE = "/pillow/";
const PORT = 4173;
// Use the installed Google Chrome (GitHub's runners have it), not a separate browser download.
const channel = "chrome";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}${BASE}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel } },
    { name: "phone", use: { ...devices["Pixel 7"], channel }, grep: /@phone/ },
  ],
  webServer: {
    command: `BASE=${BASE} npm run -s build && npx vite preview --base ${BASE} --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
