import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@renderer": resolve(__dirname, "src/renderer/src"),
    },
  },
  plugins: [react()],
  test: {
    include: ["tests/unit/**/*.test.ts", "src/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**", "out/**"],
    environment: "jsdom",
    setupFiles: ["./tests/unit/setup.ts"],
  },
});
