import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // Integration tests create temporary git repositories.
    testTimeout: 20_000,
  },
});
