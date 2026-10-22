import { describe, expect, it } from "vitest";
import { buildRuleSet } from "../../src/scan/rule-set.js";
import { scanFile } from "../../src/scan/scan-file.js";
import { DEFAULT_SETTINGS } from "../../src/scan/settings.js";
import { fake } from "../helpers/fake.js";

const rules = buildRuleSet({ denylist: ["Initech"] });
const token = fake("gh", "p_", "TESTONLY", "0".repeat(28));

describe("scanFile", () => {
  it("reports content Findings with their 1-based line number", () => {
    const findings = scanFile(
      { path: "src/a.ts", content: `// one\n// two\nconst t = "${token}";\n` },
      rules,
      DEFAULT_SETTINGS,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: "secret/github-token", path: "src/a.ts", line: 3 });
  });

  it("reports file Findings without a line", () => {
    const findings = scanFile({ path: ".env", content: "" }, rules, DEFAULT_SETTINGS);
    expect(findings).toEqual([
      expect.objectContaining({ ruleId: "sensitive-file/env-file", path: ".env" }),
    ]);
    expect(findings[0]).not.toHaveProperty("line");
  });

  it("carries the commit when there is one", () => {
    const findings = scanFile({ path: ".env", commit: "abc1234" }, rules, DEFAULT_SETTINGS);
    expect(findings[0]?.commit).toBe("abc1234");
  });

  it("runs only file rules when the content is unknown", () => {
    const findings = scanFile({ path: "notes.txt" }, rules, DEFAULT_SETTINGS);
    expect(findings).toEqual([]);
  });

  it("applies the Denylist", () => {
    const findings = scanFile({ path: "README.md", content: "Made for Initech." }, rules, {
      ...DEFAULT_SETTINGS,
    });
    expect(findings).toEqual([
      expect.objectContaining({ ruleId: "denylist/term", maskedValue: "denylist entry #1" }),
    ]);
  });

  it("skips disabled rules", () => {
    const withoutGithub = buildRuleSet({ denylist: [], disabledRules: ["secret/github-token"] });
    const findings = scanFile({ path: "a.ts", content: token }, withoutGithub, DEFAULT_SETTINGS);
    expect(findings).toEqual([]);
  });

  it("never puts the raw value in a Finding", () => {
    const findings = scanFile({ path: "a.ts", content: token }, rules, DEFAULT_SETTINGS);
    expect(JSON.stringify(findings)).not.toContain(token);
  });
});
