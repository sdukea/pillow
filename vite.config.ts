import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// BASE is set when building for GitHub Pages, which serves the app at /pillow/.
export default defineConfig({
  base: process.env.BASE ?? "/",
  plugins: [react()],
  worker: { format: "es" },
});
