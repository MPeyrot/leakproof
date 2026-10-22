import { describe, expect, it } from "vitest";
import { formatJson } from "../../src/report/json.js";
import type { Report } from "../../src/report/report.js";
import { formatText } from "../../src/report/text.js";
import type { RuleMeta } from "../../src/rules/rule.js";
import { createFinding } from "../../src/scan/finding.js";

const envFile: RuleMeta = {
  id: "sensitive-file/env-file",
  category: "sensitive-file",
  severity: "critical",
  title: "Environment file committed",
  advice: "Remove it, add it to .gitignore, rotate its values, and commit a .env.example instead.",
};
const githubToken: RuleMeta = {
  id: "secret/github-token",
  category: "secret",
  severity: "high",
  title: "GitHub token",
};
const userPath: RuleMeta = {
  id: "personal-data/user-path",
  category: "personal-data",
  severity: "medium",
  title: "Personal path",
};
const license: RuleMeta = {
  id: "hygiene/missing-license",
  category: "hygiene",
  severity: "low",
  title: "No LICENSE file at the root",
};
const authorEmail: RuleMeta = {
  id: "git-identity/personal-email",
  category: "git-identity",
  severity: "high",
  title: "Personal e-mail in the History",
};

const commit = "1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d";

function report(overrides: Partial<Report> = {}): Report {
  return { findings: [], accepted: 0, stale: [], failOn: "low", ...overrides };
}

describe("formatText", () => {
  it("escapes control characters a hostile file name could use to drive the terminal", () => {
    const findings = [createFinding({ rule: envFile, path: "a\x1b[2J\r.env" })];
    const text = formatText(report({ findings }), { color: false });
    // eslint-disable-next-line no-control-regex -- matching control characters is the point
    expect(text).not.toMatch(/[\x00-\x08\x0b-\x1f\x7f]/);
    expect(text).toContain("a\\x1b[2J\\r.env");
  });

  it("prints one block per Finding, then a summary", () => {
    const text = formatText(
      report({
        findings: [
          createFinding({ rule: envFile, path: ".env" }),
          createFinding({
            rule: githubToken,
            path: "src/a.ts",
            line: 12,
            value: "ghp_TESTONLY0123456789",
            commit,
          }),
        ],
      }),
      { color: false },
    );
    const lines = text.split("\n");
    expect(lines.slice(0, 5)).toEqual([
      "CRITICAL  sensitive-file/env-file",
      "          .env",
      "          Environment file committed",
      "          Remove it, add it to .gitignore, rotate its values, and commit a .env.example instead.",
      "",
    ]);
    expect(lines[5]).toBe("HIGH      secret/github-token");
    expect(lines[6]).toMatch(/^ {10}src\/a\.ts:12 {2}\*+\w*$/);
    expect(lines[6]).not.toContain("TESTONLY");
    expect(lines.slice(7)).toEqual([
      "          GitHub token",
      "          Introduced in commit 1a2b3c4d",
      "",
      "2 Findings: 1 critical, 1 high.",
      "",
    ]);
  });

  it("omits the location line for a Finding with neither path nor value", () => {
    const text = formatText(report({ findings: [createFinding({ rule: license })] }), {
      color: false,
    });
    expect(text).toBe(
      "LOW       hygiene/missing-license\n          No LICENSE file at the root\n\n1 Finding: 1 low.\n",
    );
  });

  it("shows only the masked value for an identity Finding", () => {
    const text = formatText(
      report({
        findings: [createFinding({ rule: authorEmail, commit, value: "someone@example.test" })],
      }),
      { color: false },
    );
    const lines = text.split("\n");
    expect(lines[1]).toMatch(/^ {10}\S+$/);
    expect(lines[1]).not.toContain("someone@example.test");
    expect(lines).toContain("          Introduced in commit 1a2b3c4d");
  });

  it("prints 'No Finding.' with the number of accepted Findings", () => {
    expect(formatText(report(), { color: false })).toBe("No Finding.\n");
    expect(formatText(report({ accepted: 2 }), { color: false })).toBe(
      "No Finding. 2 accepted by the Baseline.\n",
    );
  });

  it("counts Severities in order and accepted Findings after them", () => {
    const text = formatText(
      report({
        findings: [
          createFinding({ rule: userPath, path: "a.ts" }),
          createFinding({ rule: userPath, path: "b.ts" }),
          createFinding({ rule: envFile, path: ".env" }),
        ],
        accepted: 1,
      }),
      { color: false },
    );
    expect(text.trimEnd().split("\n").at(-1)).toBe(
      "3 Findings: 1 critical, 2 medium. 1 accepted by the Baseline.",
    );
  });

  it("colours only the Severity label, and only when asked", () => {
    const findings = [createFinding({ rule: envFile, path: ".env" })];
    const plain = formatText(report({ findings }), { color: false });
    const colored = formatText(report({ findings }), { color: true });
    expect(plain).not.toContain("\x1b[");
    expect(colored).toContain("\x1b[31mCRITICAL\x1b[0m  sensitive-file/env-file");
    expect(colored.replaceAll("\x1b[31m", "").replaceAll("\x1b[0m", "")).toBe(plain);
  });

  it("colours medium in yellow and low dim", () => {
    const text = formatText(
      report({
        findings: [createFinding({ rule: userPath }), createFinding({ rule: license })],
      }),
      { color: true },
    );
    expect(text).toContain("\x1b[33mMEDIUM\x1b[0m");
    expect(text).toContain("\x1b[2mLOW\x1b[0m");
  });
});

describe("formatJson", () => {
  it("serializes the Findings and a summary", () => {
    const findings = [
      createFinding({ rule: envFile, path: ".env" }),
      createFinding({ rule: userPath, path: "a.ts", line: 3, value: "value-TESTONLY" }),
    ];
    const stale = [{ fingerprint: "0123456789abcdef", ruleId: "secret/x", reason: "old" }];
    const text = formatJson(report({ findings, accepted: 4, stale, failOn: "high" }));
    expect(text.endsWith("}\n")).toBe(true);
    expect(text).toContain('\n  "version": 1,');
    expect(JSON.parse(text)).toEqual({
      version: 1,
      failOn: "high",
      findings,
      summary: {
        total: 2,
        bySeverity: { critical: 1, high: 0, medium: 1, low: 0 },
        accepted: 4,
        staleBaselineEntries: 1,
      },
    });
  });

  it("is valid for an empty report", () => {
    const parsed = JSON.parse(formatJson(report())) as { summary: { total: number } };
    expect(parsed.summary.total).toBe(0);
  });
});
