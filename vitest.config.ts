import react from "@vitejs/plugin-react";
import { defineConfig, defineProject } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      defineProject({
        test: {
          name: "node",
          globals: true,
          include: ["src/interpreter/**/*.spec.ts", "src/renderer/lib/**/*.spec.ts"],
          environment: "node",
        },
      }),

      defineProject({
        plugins: [react()],
        test: {
          name: "renderer",
          globals: true,
          include: ["src/renderer/**/*.spec.tsx", "src/renderer/hooks/**/*.spec.ts"],
          environment: "jsdom",
          setupFiles: ["src/renderer/test-setup.ts"],
          css: true,
        },
      }),
    ],
  },
});
