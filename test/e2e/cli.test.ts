import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fake } from "../helpers/fake.js";
import { ISOLATED_GIT_ENV, createRepo, type TestRepo } from "../helpers/repo.js";

const exec = promisify(execFile);
const MAIN = fileURLToPath(new URL("../../dist/cli/main.js", import.meta.url));

interface Result {
  code: number;
  stdout: string;
  stderr: string;
}

/** Runs the compiled CLI in a child process, as a user would. */
async function leakproof(args: string[], cwd: string): Promise<Result> {
  const env = { ...ISOLATED_GIT_ENV, NO_COLOR: "1" };
  try {
    const { stdout, stderr } = await exec(process.execPath, [MAIN, ...args], { cwd, env });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code: number; stdout: string; stderr: string };
    return { code: failure.code, stdout: failure.stdout, stderr: failure.stderr };
  }
}

let repo: TestRepo;
beforeEach(() => {
  repo = createRepo();
  repo.write("LICENSE", "MIT\n");
  repo.write("README.md", "# Fixture\n");
  repo.write(".gitignore", "node_modules/\n");
});
afterEach(() => {
  repo.remove();
});

describe("leakproof (dist/)", () => {
  it("prints the version", async () => {
    const { code, stdout } = await leakproof(["--version"], repo.dir);
    expect(code).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("prints the usage", async () => {
    const { code, stdout } = await leakproof(["--help"], repo.dir);
    expect(code).toBe(0);
    expect(stdout).toContain("Usage: leakproof [path] [options]");
  });

  it("exits 0 on a clean repository", async () => {
    repo.commit("initial");
    const { code, stdout } = await leakproof([], repo.dir);
    expect(code).toBe(0);
    expect(stdout).toBe("No Finding.\n");
  });

  it("exits 1 with the report on stdout when there is a Finding", async () => {
    repo.write("src/a.ts", `const token = "${fake("gh", "p_", "TESTONLY", "0".repeat(28))}";\n`);
    repo.commit("initial");
    const { code, stdout, stderr } = await leakproof([], repo.dir);
    expect(code).toBe(1);
    expect(stdout).toContain("secret/github-token");
    expect(stdout).toContain("src/a.ts:1");
    expect(stderr).toBe("");
  });

  it("prints JSON that parses", async () => {
    repo.write(".env", "A=1\n");
    repo.commit("initial");
    const { code, stdout } = await leakproof(["--format", "json"], repo.dir);
    expect(code).toBe(1);
    const report = JSON.parse(stdout) as { findings: { ruleId: string }[] };
    expect(report.findings.map((f) => f.ruleId)).toContain("sensitive-file/env-file");
  });

  it("exits 2 on bad usage", async () => {
    const { code, stderr } = await leakproof(["--nope"], repo.dir);
    expect(code).toBe(2);
    expect(stderr).toContain("--nope");
  });
});
