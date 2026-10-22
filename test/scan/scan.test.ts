import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Finding } from "../../src/scan/finding.js";
import { buildRuleSet } from "../../src/scan/rule-set.js";
import { scan, type ScanOptions } from "../../src/scan/scan.js";
import { DEFAULT_SETTINGS } from "../../src/scan/settings.js";
import { fake } from "../helpers/fake.js";
import { createRepo, type TestRepo } from "../helpers/repo.js";

const token = fake("gh", "p_", "TESTONLY", "0".repeat(28));

let repo: TestRepo;
beforeEach(() => {
  repo = createRepo();
});
afterEach(() => {
  repo.remove();
});

function run(options: Partial<ScanOptions> = {}): Promise<Finding[]> {
  return scan({
    root: repo.dir,
    target: "worktree",
    history: false,
    settings: DEFAULT_SETTINGS,
    rules: buildRuleSet({ denylist: [] }),
    ...options,
  });
}

function ids(findings: Finding[]): string[] {
  return findings.map((f) => f.ruleId);
}

describe("scan, default target", () => {
  it("finds secrets in the Worktree", async () => {
    repo.write("src/config.ts", `export const token = "${token}";\n`);
    const findings = await run();
    expect(findings).toEqual([
      expect.objectContaining({ ruleId: "secret/github-token", path: "src/config.ts", line: 1 }),
    ]);
  });

  it("reports a sensitive file that is ignored now but still in the History", async () => {
    repo.write(".env", "A=1\n");
    const commit = repo.commit("oops");
    repo.git("rm", "-q", "--cached", ".env");
    repo.write(".gitignore", ".env\n");
    repo.commit("ignore env");

    const findings = await run();
    expect(findings).toEqual([
      expect.objectContaining({ ruleId: "sensitive-file/env-file", path: ".env", commit }),
    ]);
    expect(findings[0]?.advice).toMatch(/History/);
  });

  it("reports a tracked sensitive file once, with the commit that added it", async () => {
    repo.write("server.key", "x");
    const commit = repo.commit("add key");
    const findings = await run();
    expect(findings).toEqual([
      expect.objectContaining({ ruleId: "sensitive-file/private-key", path: "server.key", commit }),
    ]);
  });

  it("does not read History contents without --history", async () => {
    repo.write("a.ts", token);
    repo.commit("secret");
    repo.write("a.ts", "clean");
    repo.commit("clean");
    expect(await run()).toEqual([]);
  });
});

describe("scan --history", () => {
  it("finds secrets that were removed from the files", async () => {
    repo.write("a.ts", `\n\nconst t = "${token}";\n`);
    const commit = repo.commit("secret");
    repo.write("a.ts", "clean");
    repo.commit("clean");

    const findings = await run({ history: true });
    expect(findings).toEqual([
      expect.objectContaining({ ruleId: "secret/github-token", path: "a.ts", line: 3, commit }),
    ]);
  });

  it("reports a secret still present once, with its introducing commit", async () => {
    repo.write("a.ts", token);
    const commit = repo.commit("secret");
    repo.write("b.ts", "other");
    repo.commit("other");

    const findings = await run({ history: true });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: "secret/github-token", path: "a.ts", commit });
  });

  it("reports personal author e-mails, masked", async () => {
    const personal = fake("fixture.not.real", "@", "gmail.com");
    const commit = repo.commit("hello", { GIT_AUTHOR_EMAIL: personal });

    const findings = await run({ history: true });
    expect(findings).toEqual([
      expect.objectContaining({
        ruleId: "git-identity/personal-email",
        commit,
        maskedValue: "f***@g***.com",
      }),
    ]);
    expect(JSON.stringify(findings)).not.toContain(personal);
  });
});

describe("scan, staged target", () => {
  it("only looks at the staged content", async () => {
    repo.write("staged.ts", token);
    repo.git("add", "staged.ts");
    repo.write("unstaged.ts", token);
    const findings = await run({ target: "staged" });
    expect(findings.map((f) => f.path)).toEqual(["staged.ts"]);
    expect(ids(findings)).toEqual(["secret/github-token"]);
  });
});

describe("scan ordering", () => {
  it("sorts Findings by severity, then path, then line", async () => {
    repo.write("b.ts", `${token}\n`);
    repo.write("a.ts", `\n${token}\n`);
    repo.write(".DS_Store", "x");
    const findings = await run();
    expect(findings.map((f) => `${f.severity} ${f.path ?? ""}:${String(f.line ?? "")}`)).toEqual([
      "critical a.ts:2",
      "critical b.ts:1",
      "low .DS_Store:",
    ]);
  });
});
