import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// BASE is set when building for GitHub Pages, which serves the app at /pillow/.
export default defineConfig({
  base: process.env.BASE ?? "/",
  plugins: [react()],
  worker: { format: "es" },
  // In development, Pillow's API server (npm run server) answers /api.
  server: { proxy: { "/api": "http://localhost:8787" } },
});
