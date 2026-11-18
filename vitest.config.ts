import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["engine/**/*.test.ts", "src/**/*.test.ts", "pipeline/**/*.test.ts", "server/**/*.test.ts", "src/**/*.test.tsx"], testTimeout: 20_000 },
});
