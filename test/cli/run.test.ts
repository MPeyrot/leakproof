import { describe, expect, it } from "vitest";
import { run } from "../../src/cli/run.js";
import { captureIo } from "../helpers/io.js";

describe("run", () => {
  it("prints usage and exits 0 with --help", async () => {
    const io = captureIo();
    const code = await run(["--help"], io);
    expect(code).toBe(0);
    expect(io.stdout()).toContain("Usage: leakproof [path] [options]");
    expect(io.stdout()).toContain("--history");
  });

  it("prints the package version with --version", async () => {
    const io = captureIo();
    const code = await run(["--version"], io);
    expect(code).toBe(0);
    expect(io.stdout().trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("exits 2 on an unknown option", async () => {
    const io = captureIo();
    const code = await run(["--nope"], io);
    expect(code).toBe(2);
    expect(io.stderr()).toContain("--nope");
  });
});
