import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Finding } from "../../src/scan/finding.js";
import { HYGIENE_RULES } from "../../src/rules/hygiene/index.js";
import { compileIgnoredPaths } from "../../src/scan/ignored-paths.js";
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

/** Hygiene is off by default so that other tests only see the Findings they are about. */
const HYGIENE_IDS = HYGIENE_RULES.map((rule) => rule.id);

function run(options: Partial<ScanOptions> = {}): Promise<Finding[]> {
  return scan({
    root: repo.dir,
    target: "worktree",
    history: false,
    settings: DEFAULT_SETTINGS,
    rules: buildRuleSet({ denylist: [], disabledRules: HYGIENE_IDS }),
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

describe("scan, disabled identity rule", () => {
  it("reports no author e-mail once git-identity/personal-email is disabled", async () => {
    repo.commit("hello", { GIT_AUTHOR_EMAIL: fake("fixture.not.real", "@", "gmail.com") });
    const rules = buildRuleSet({
      denylist: [],
      disabledRules: [...HYGIENE_IDS, "git-identity/personal-email"],
    });
    expect(await run({ history: true, rules })).toEqual([]);
  });
});

describe("scan, Ignored paths", () => {
  const ignoredPaths = compileIgnoredPaths(["fixtures/**", "server.key"]);

  it("does not scan ignored files of the Worktree", async () => {
    repo.write("fixtures/a.ts", token);
    repo.write("server.key", "x");
    repo.write("src/b.ts", token);
    const findings = await run({ ignoredPaths });
    expect(findings.map((f) => f.path)).toEqual(["src/b.ts"]);
  });

  it("does not scan ignored staged files", async () => {
    repo.write("fixtures/a.ts", token);
    repo.write("src/b.ts", token);
    repo.git("add", "-A");
    const findings = await run({ target: "staged", ignoredPaths });
    expect(findings.map((f) => f.path)).toEqual(["src/b.ts"]);
  });

  it("does not scan the History blobs of ignored paths", async () => {
    repo.write("fixtures/a.ts", token);
    repo.write("src/b.ts", `${token}x`);
    repo.commit("secrets");
    repo.git("rm", "-rq", "fixtures", "src");
    repo.commit("clean");
    const findings = await run({ history: true, ignoredPaths });
    expect(findings.map((f) => f.path)).toEqual(["src/b.ts"]);
  });

  it("still scans a History blob that also lives under a path that is not ignored", async () => {
    repo.write("fixtures/a.ts", token);
    repo.commit("fixture");
    repo.write("src/b.ts", token);
    repo.commit("copy");
    repo.git("rm", "-rq", "fixtures", "src");
    repo.commit("clean");
    const findings = await run({ history: true, ignoredPaths });
    expect(findings.map((f) => f.path)).toEqual(["src/b.ts"]);
  });

  it("does not report ignored sensitive file names found in the History", async () => {
    repo.write("server.key", "x");
    repo.write("other.key", "x");
    repo.commit("keys");
    repo.git("rm", "-q", "server.key", "other.key");
    repo.commit("remove");
    const findings = await run({ ignoredPaths });
    expect(findings.map((f) => f.path)).toEqual(["other.key"]);
  });

  it("still counts ignored files as present for the hygiene Rules", async () => {
    repo.write("README.md", "# Fixture\n");
    repo.write(".gitignore", "node_modules\n");
    repo.write("LICENSE", "MIT\n");
    const rules = buildRuleSet({ denylist: [] });
    const findings = await run({
      rules,
      ignoredPaths: compileIgnoredPaths(["README.md", "LICENSE"]),
    });
    expect(findings).toEqual([]);
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

describe("scan, repository hygiene", () => {
  const withHygiene = () => buildRuleSet({ denylist: [] });
  const hygiene = (findings: Finding[]) => findings.filter((f) => f.category === "hygiene");

  it("reports missing repository files on the Worktree, without a path", async () => {
    repo.write("src/a.ts", "export {};\n");
    const findings = hygiene(await run({ rules: withHygiene() }));
    expect(ids(findings).sort()).toEqual([
      "hygiene/missing-gitignore",
      "hygiene/missing-license",
      "hygiene/missing-readme",
    ]);
    expect(findings.every((f) => f.path === undefined && f.line === undefined)).toBe(true);
  });

  it("reports nothing on the staged target", async () => {
    repo.write("src/a.ts", "export {};\n");
    repo.git("add", "src/a.ts");
    expect(await run({ target: "staged", rules: withHygiene() })).toEqual([]);
  });

  it("reports nothing when the repository is in good shape", async () => {
    repo.write(".gitignore", ".env\n");
    repo.write(".env.example", "A=\n");
    repo.write("LICENSE", "MIT\n");
    repo.write("README.md", "# Fixture\n");
    expect(await run({ rules: withHygiene() })).toEqual([]);
  });

  it("reports a missing .env.example only when an ignored .env exists on disk", async () => {
    repo.write(".gitignore", ".env\nnode_modules/\n");
    repo.write("LICENSE", "MIT\n");
    repo.write("README.md", "# Fixture\n");
    repo.write("node_modules/pkg/.env", "A=1\n");
    expect(await run({ rules: withHygiene() })).toEqual([]);
    repo.write(".env", "A=1\n");
    expect(ids(await run({ rules: withHygiene() }))).toEqual(["hygiene/missing-env-example"]);
  });

  it("skips disabled hygiene rules", async () => {
    repo.write("src/a.ts", "export {};\n");
    const rules = buildRuleSet({ denylist: [], disabledRules: ["hygiene/missing-license"] });
    expect(ids(hygiene(await run({ rules })))).not.toContain("hygiene/missing-license");
  });
});
