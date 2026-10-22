import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Io } from "../../src/cli/io.js";
import { run } from "../../src/cli/run.js";
import { fake } from "../helpers/fake.js";
import { captureIo } from "../helpers/io.js";
import { createRepo, type TestRepo } from "../helpers/repo.js";

const token = fake("gh", "p_", "TESTONLY", "0".repeat(28));

let repo: TestRepo;
beforeEach(() => {
  repo = createRepo();
});
afterEach(() => {
  repo.remove();
});

/** A repository with the files the hygiene Rules look for, so it has no Finding. */
function cleanRepo(): void {
  repo.write("LICENSE", "MIT\n");
  repo.write("README.md", "# Fixture\n");
  repo.write(".gitignore", "node_modules/\n");
  repo.write("src/index.ts", "export const answer = 42;\n");
  repo.commit("initial");
}

async function scanRepo(args: string[] = [], options: Partial<Pick<Io, "env" | "isTTY">> = {}) {
  const io = captureIo({ cwd: repo.dir, ...options });
  const code = await run(args, io);
  return { code, stdout: io.stdout(), stderr: io.stderr() };
}

describe("run, informational options", () => {
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
});

describe("run, usage errors", () => {
  it("exits 2 on an unknown option", async () => {
    const { code, stderr } = await scanRepo(["--nope"]);
    expect(code).toBe(2);
    expect(stderr).toContain("--nope");
    expect(stderr).toContain("leakproof --help");
  });

  it("exits 2 on more than one path", async () => {
    cleanRepo();
    const { code, stderr } = await scanRepo([".", "other"]);
    expect(code).toBe(2);
    expect(stderr).toContain("at most one path");
  });

  it("exits 2 on --since without --history", async () => {
    cleanRepo();
    const { code, stderr } = await scanRepo(["--since", "HEAD"]);
    expect(code).toBe(2);
    expect(stderr).toContain("--since");
  });

  it("exits 2 on --staged with --history", async () => {
    cleanRepo();
    const { code, stderr } = await scanRepo(["--staged", "--history"]);
    expect(code).toBe(2);
    expect(stderr).toContain("--staged");
  });

  it("exits 2 on an invalid --format", async () => {
    cleanRepo();
    const { code, stderr } = await scanRepo(["--format", "xml"]);
    expect(code).toBe(2);
    expect(stderr).toContain("text or json");
  });

  it("exits 2 on an invalid --fail-on, listing the valid values", async () => {
    cleanRepo();
    const { code, stderr } = await scanRepo(["--fail-on", "severe"]);
    expect(code).toBe(2);
    expect(stderr).toContain("critical, high, medium, low");
  });
});

describe("run, repository", () => {
  it("exits 2 outside a git repository", async () => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), "leakproof-plain-")));
    try {
      const io = captureIo({ cwd: dir });
      expect(await run([], io)).toBe(2);
      expect(io.stderr()).toContain("not a git repository");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("scans the repository given as path, relative to the working directory", async () => {
    cleanRepo();
    repo.write("src/a.ts", `const token = "${token}";\n`);
    const io = captureIo({ cwd: join(repo.dir, "..") });
    const folder = repo.dir.slice(repo.dir.lastIndexOf("/") + 1);
    expect(await run([folder], io)).toBe(1);
    expect(io.stdout()).toContain("secret/github-token");
  });

  it("reports the file, never an absolute path", async () => {
    cleanRepo();
    repo.write("src/a.ts", `const token = "${token}";\n`);
    const { stdout } = await scanRepo();
    expect(stdout).toContain("src/a.ts:1");
    expect(stdout).not.toContain(repo.dir);
    expect(stdout).not.toContain(token);
  });
});

describe("run, exit codes", () => {
  it("exits 0 and says so on a clean repository", async () => {
    cleanRepo();
    const { code, stdout, stderr } = await scanRepo();
    expect(code).toBe(0);
    expect(stdout).toBe("No Finding.\n");
    expect(stderr).toBe("");
  });

  it("exits 1 when a secret is found", async () => {
    cleanRepo();
    repo.write("src/a.ts", `const token = "${token}";\n`);
    const { code, stdout } = await scanRepo();
    expect(code).toBe(1);
    expect(stdout).toMatch(/^(CRITICAL|HIGH) +secret\/github-token$/m);
    expect(stdout).toMatch(/^1 Finding: 1 (critical|high)\.$/m);
  });

  it("exits 0 with --fail-on critical when the only Finding is a medium one", async () => {
    cleanRepo();
    repo.write("data.bak", "x");
    expect((await scanRepo()).code).toBe(1);
    const { code, stdout } = await scanRepo(["--fail-on", "critical"]);
    expect(code).toBe(0);
    expect(stdout).toContain("sensitive-file/backup");
  });

  it("uses failOn from the configuration when there is no flag", async () => {
    cleanRepo();
    repo.write("data.bak", "x");
    repo.write(".leakproofrc.json", JSON.stringify({ failOn: "high" }));
    expect((await scanRepo()).code).toBe(0);
    expect((await scanRepo(["--fail-on", "medium"])).code).toBe(1);
  });

  it("applies ignoredPaths from the configuration", async () => {
    cleanRepo();
    repo.write("data.bak", "x");
    repo.write(
      ".leakproofrc.json",
      JSON.stringify({ ignoredPaths: [{ pattern: "data.bak", reason: "Fixture file" }] }),
    );
    expect((await scanRepo()).code).toBe(0);
  });
});

describe("run, configuration and Baseline errors", () => {
  it("exits 2 on an invalid configuration, naming the file", async () => {
    cleanRepo();
    repo.write(".leakproofrc.json", "{ nope");
    const { code, stderr } = await scanRepo();
    expect(code).toBe(2);
    expect(stderr).toContain(".leakproofrc.json");
  });

  it("exits 2 when --config does not exist", async () => {
    cleanRepo();
    const { code, stderr } = await scanRepo(["--config", "missing.json"]);
    expect(code).toBe(2);
    expect(stderr).toContain("missing.json: file not found");
  });

  it("exits 2 on a Baseline entry without a Reason", async () => {
    cleanRepo();
    repo.write("data.bak", "x");
    await scanRepo(["--write-baseline", ".leakproof-baseline.json"]);
    const { code, stderr } = await scanRepo();
    expect(code).toBe(2);
    expect(stderr).toContain("no Reason");
  });
});

describe("run, Baseline", () => {
  function writeReasons(reason: string): void {
    const file = join(repo.dir, ".leakproof-baseline.json");
    const baseline = JSON.parse(readFileSync(file, "utf8")) as { findings: { reason: string }[] };
    for (const entry of baseline.findings) entry.reason = reason;
    writeFileSync(file, JSON.stringify(baseline));
  }

  it("accepts the Findings it lists and counts them", async () => {
    cleanRepo();
    repo.write("data.bak", "x");
    await scanRepo(["--write-baseline", ".leakproof-baseline.json"]);
    writeReasons("Kept on purpose for the demo");
    const { code, stdout, stderr } = await scanRepo();
    expect(code).toBe(0);
    expect(stdout).toBe("No Finding. 1 accepted by the Baseline.\n");
    expect(stderr).toBe("");
  });

  it("warns about a stale entry on stderr", async () => {
    cleanRepo();
    repo.write("data.bak", "x");
    await scanRepo(["--write-baseline", ".leakproof-baseline.json"]);
    writeReasons("Kept on purpose for the demo");
    rmSync(join(repo.dir, "data.bak"));
    const { code, stdout, stderr } = await scanRepo();
    expect(code).toBe(0);
    expect(stdout).toBe("No Finding.\n");
    expect(stderr).toMatch(
      /^warning: Baseline entry [0-9a-f]{16} \(sensitive-file\/backup data\.bak\) matches no Finding any more\n$/,
    );
  });

  it("reads the Baseline given by --baseline, relative to the working directory", async () => {
    cleanRepo();
    repo.write("data.bak", "x");
    await scanRepo(["--write-baseline", "mine.json"]);
    const file = join(repo.dir, "mine.json");
    const baseline = JSON.parse(readFileSync(file, "utf8")) as { findings: { reason: string }[] };
    for (const entry of baseline.findings) entry.reason = "Because";
    writeFileSync(file, JSON.stringify(baseline));
    expect((await scanRepo(["--baseline", "mine.json"])).code).toBe(0);
  });

  describe("--write-baseline", () => {
    it("writes every Finding with an empty Reason and exits 0 without a report", async () => {
      cleanRepo();
      repo.write("data.bak", "x");
      const { code, stdout, stderr } = await scanRepo(["--write-baseline", "baseline.json"]);
      expect(code).toBe(0);
      expect(stdout).toBe("");
      expect(stderr).toBe(
        "Wrote 1 entry to baseline.json. Write a reason for each one before the next scan.\n",
      );
      const written = JSON.parse(readFileSync(join(repo.dir, "baseline.json"), "utf8")) as {
        findings: { ruleId: string; path: string; reason: string }[];
      };
      expect(written.findings).toEqual([
        expect.objectContaining({ ruleId: "sensitive-file/backup", path: "data.bak", reason: "" }),
      ]);
    });

    it("keeps the Reasons already written, even beside empty ones", async () => {
      cleanRepo();
      repo.write("data.bak", "x");
      await scanRepo(["--write-baseline", ".leakproof-baseline.json"]);
      writeReasons("Kept on purpose for the demo");
      repo.write("src/a.ts", `const token = "${token}";\n`);

      const second = await scanRepo(["--write-baseline", ".leakproof-baseline.json"]);
      expect(second.code).toBe(0);
      // The new entry has an empty Reason, which must not block the next rewrite.
      const third = await scanRepo(["--write-baseline", ".leakproof-baseline.json"]);
      expect(third.code).toBe(0);

      const written = JSON.parse(
        readFileSync(join(repo.dir, ".leakproof-baseline.json"), "utf8"),
      ) as { findings: { path: string; reason: string }[] };
      const reasons = Object.fromEntries(written.findings.map((f) => [f.path, f.reason]));
      expect(reasons).toEqual({ "data.bak": "Kept on purpose for the demo", "src/a.ts": "" });
    });
  });
});

describe("run, output format", () => {
  it("prints parseable JSON with a summary", async () => {
    cleanRepo();
    repo.write("data.bak", "x");
    const { code, stdout } = await scanRepo(["--format", "json"], { isTTY: true });
    expect(code).toBe(1);
    expect(stdout).not.toContain("\x1b[");
    const report = JSON.parse(stdout) as {
      version: number;
      failOn: string;
      findings: { ruleId: string }[];
      summary: { total: number; bySeverity: Record<string, number> };
    };
    expect(report.version).toBe(1);
    expect(report.failOn).toBe("low");
    expect(report.findings.map((f) => f.ruleId)).toEqual(["sensitive-file/backup"]);
    expect(report.summary.total).toBe(1);
    expect(report.summary.bySeverity["medium"]).toBe(1);
  });

  it("colours the text report only on a terminal without NO_COLOR", async () => {
    cleanRepo();
    repo.write("data.bak", "x");
    expect((await scanRepo([], { isTTY: false })).stdout).not.toContain("\x1b[");
    expect((await scanRepo([], { isTTY: true })).stdout).toContain("\x1b[33mMEDIUM");
    const noColor = await scanRepo([], { isTTY: true, env: { NO_COLOR: "1" } });
    expect(noColor.stdout).not.toContain("\x1b[");
  });
});

describe("run, scan targets", () => {
  it("scans only the index with --staged", async () => {
    cleanRepo();
    repo.write("src/staged.ts", `const token = "${token}";\n`);
    repo.git("add", "src/staged.ts");
    repo.write("src/unstaged.ts", `const other = "${token}";\n`);
    const { code, stdout } = await scanRepo(["--staged"]);
    expect(code).toBe(1);
    expect(stdout).toContain("src/staged.ts");
    expect(stdout).not.toContain("src/unstaged.ts");
  });

  it("exits 0 with --staged when nothing is staged", async () => {
    cleanRepo();
    repo.write("src/a.ts", `const token = "${token}";\n`);
    expect((await scanRepo(["--staged"])).code).toBe(0);
  });

  it("finds a removed secret only with --history", async () => {
    cleanRepo();
    repo.write("src/a.ts", `const token = "${token}";\n`);
    repo.commit("oops");
    repo.write("src/a.ts", "const token = process.env.TOKEN;\n");
    repo.commit("fix");
    expect((await scanRepo()).code).toBe(0);
    const { code, stdout } = await scanRepo(["--history"]);
    expect(code).toBe(1);
    expect(stdout).toContain("src/a.ts");
    expect(stdout).toMatch(/Introduced in commit [0-9a-f]{8}$/m);
  });

  it("limits --history to the commits after the ref given by --since", async () => {
    cleanRepo();
    repo.write("src/old.ts", `const token = "${token}";\n`);
    repo.commit("old secret");
    repo.write("src/old.ts", "const token = process.env.TOKEN;\n");
    repo.commit("fix");
    repo.git("tag", "v1");
    repo.write("src/new.ts", `const other = "${token}";\n`);
    repo.commit("new secret");
    repo.write("src/new.ts", "const other = process.env.OTHER;\n");
    repo.commit("fix again");

    const { code, stdout } = await scanRepo(["--history", "--since", "v1"]);
    expect(code).toBe(1);
    expect(stdout).toContain("src/new.ts");
    expect(stdout).not.toContain("src/old.ts");
  });

  it("exits 2 on an unknown --since ref", async () => {
    cleanRepo();
    const { code, stderr } = await scanRepo(["--history", "--since", "nope"]);
    expect(code).toBe(2);
    expect(stderr).toContain("unknown ref for --since: nope");
  });
});
