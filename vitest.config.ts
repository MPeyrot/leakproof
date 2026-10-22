import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // Compiles dist/ for the E2E tests.
    globalSetup: ["test/e2e/global-setup.ts"],
    // Integration tests create temporary git repositories.
    testTimeout: 20_000,
    // Keep the developer's git configuration (global ignores, hooks, signing) out of every git
    // call, including the ones leakproof itself makes.
    env: { GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  },
});
