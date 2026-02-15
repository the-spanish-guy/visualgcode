import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist/renderer",
    target: "baseline-widely-available",
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    exclude: ["monaco-editor"],
  },
  worker: {
    format: "es",
  },
});