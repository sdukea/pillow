import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["engine/**/*.test.ts", "src/**/*.test.ts"], testTimeout: 20_000 },
});
