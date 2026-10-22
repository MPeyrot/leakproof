import { execFileSync } from "node:child_process";
import { join } from "node:path";

/** The E2E tests run the compiled CLI: build `dist/` once before any test file. */
export default function buildDist(): void {
  const tsc = join("node_modules", "typescript", "bin", "tsc");
  execFileSync(process.execPath, [tsc, "-p", "tsconfig.build.json"], { stdio: "inherit" });
}
