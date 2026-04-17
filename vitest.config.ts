import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/unit/setup.ts"],
    include: ["test/unit/**/*.test.ts?(x)"],
    css: true,
    globals: true,
  },
});

