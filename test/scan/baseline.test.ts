import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BASELINE_FILE,
  BaselineError,
  applyBaseline,
  loadBaseline,
  parseBaseline,
  serializeBaseline,
  type Baseline,
  type BaselineEntry,
} from "../../src/scan/baseline.js";
import { createFinding, type Finding } from "../../src/scan/finding.js";
import { fake } from "../helpers/fake.js";

const githubToken = {
  id: "secret/github-token",
  category: "secret",
  severity: "critical",
  title: "GitHub token",
} as const;
const value = fake("gh", "p_", "TESTONLY", "0".repeat(28));

function finding(path: string | undefined, secret = value): Finding {
  return createFinding({
    rule: githubToken,
    ...(path !== undefined && { path }),
    line: 3,
    value: secret,
  });
}

const entry = (fingerprint: string, reason = "Revoked key kept for the tutorial") => ({
  fingerprint,
  ruleId: "secret/github-token",
  path: "src/a.ts",
  reason,
});
const FP_A = "0123456789abcdef";
const FP_B = "fedcba9876543210";
const text = (findings: unknown[], version: unknown = 1) => JSON.stringify({ version, findings });

function writtenEntries(output: string): BaselineEntry[] {
  return (JSON.parse(output) as { findings: BaselineEntry[] }).findings;
}

function messageOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(BaselineError);
    return (error as Error).message;
  }
  throw new Error("expected a BaselineError");
}

describe("parseBaseline", () => {
  it("reads the entries", () => {
    const baseline = parseBaseline(text([entry(FP_A), { ...entry(FP_B), path: undefined }]), "b");
    expect(baseline.entries).toEqual([
      entry(FP_A),
      {
        fingerprint: FP_B,
        ruleId: "secret/github-token",
        reason: "Revoked key kept for the tutorial",
      },
    ]);
  });

  it("accepts an empty Baseline", () => {
    expect(parseBaseline(text([]), "b").entries).toEqual([]);
  });

  it("rejects invalid JSON and a top level that is not an object", () => {
    expect(messageOf(() => parseBaseline("{x", "b.json"))).toMatch(/^b\.json: invalid JSON/);
    expect(messageOf(() => parseBaseline("[]", "b.json"))).toMatch(/top level/);
  });

  it("rejects another version", () => {
    expect(messageOf(() => parseBaseline(text([], 2), "b.json"))).toBe("b.json: version must be 1");
    expect(messageOf(() => parseBaseline('{"findings": []}', "b.json"))).toMatch(/version/);
  });

  it("rejects unknown keys at the top level and in entries", () => {
    expect(messageOf(() => parseBaseline('{"version":1,"findings":[],"x":1}', "b"))).toMatch(
      /unknown key "x"/,
    );
    expect(messageOf(() => parseBaseline(text([{ ...entry(FP_A), line: 3 }]), "b"))).toMatch(
      /findings\[0\]\.line is not a known key/,
    );
  });

  it("rejects a fingerprint that is not 16 lowercase hex characters", () => {
    for (const bad of ["0123", "0123456789ABCDEF", "0123456789abcdeg", "0123456789abcdef0", 12]) {
      expect(messageOf(() => parseBaseline(text([entry(bad as string)]), "b"))).toMatch(
        /findings\[0\]\.fingerprint must be 16 lowercase hexadecimal characters/,
      );
    }
  });

  it("rejects duplicate fingerprints", () => {
    expect(messageOf(() => parseBaseline(text([entry(FP_A), entry(FP_A)]), "b"))).toBe(
      `b: duplicate fingerprint ${FP_A}`,
    );
  });

  it("rejects entries without a Reason, counting them", () => {
    const message = messageOf(() =>
      parseBaseline(text([entry(FP_A, ""), entry(FP_B, "   ")]), BASELINE_FILE),
    );
    expect(message).toMatch(/^\.leakproof-baseline\.json: 2 entries have no Reason/);
    expect(message).toMatch(/written justification/);
    expect(messageOf(() => parseBaseline(text([entry(FP_A, "")]), "b"))).toMatch(
      /1 entry has no Reason/,
    );
  });

  it("rejects a Reason that is not a string", () => {
    const bad = { ...entry(FP_A), reason: undefined };
    expect(messageOf(() => parseBaseline(text([bad]), "b"))).toMatch(/reason must be a string/);
  });
});

describe("loadBaseline", () => {
  let dir: string;
  let repoRoot: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "leakproof-baseline-"));
    repoRoot = join(dir, "repo");
    mkdirSync(repoRoot);
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("is empty without a file at the default path", () => {
    expect(loadBaseline({ repoRoot, cwd: dir }).entries).toEqual([]);
  });

  it("reads the default file from the repository root", () => {
    writeFileSync(join(repoRoot, BASELINE_FILE), text([entry(FP_A)]));
    expect(loadBaseline({ repoRoot, cwd: dir }).entries).toHaveLength(1);
  });

  it("reads an explicit path relative to the working directory", () => {
    writeFileSync(join(dir, "mine.json"), text([entry(FP_A), entry(FP_B)]));
    expect(loadBaseline({ repoRoot, cwd: dir, path: "mine.json" }).entries).toHaveLength(2);
  });

  it("fails when an explicit path does not exist", () => {
    expect(messageOf(() => loadBaseline({ repoRoot, cwd: dir, path: "nope.json" }))).toBe(
      "nope.json: file not found",
    );
  });
});

describe("applyBaseline", () => {
  it("removes accepted Findings and counts them", () => {
    const accepted = finding("src/a.ts");
    const other = finding("src/b.ts");
    const baseline: Baseline = { entries: [entry(accepted.fingerprint)] };
    expect(applyBaseline([accepted, other], baseline)).toEqual({
      findings: [other],
      accepted: 1,
      stale: [],
    });
  });

  it("reports entries that match nothing as stale", () => {
    const current = finding("src/a.ts");
    const old = entry(FP_A);
    const result = applyBaseline([current], { entries: [entry(current.fingerprint), old] });
    expect(result.stale).toEqual([old]);
    expect(result.findings).toEqual([]);
  });

  it("changes nothing with an empty Baseline", () => {
    const findings = [finding("src/a.ts")];
    expect(applyBaseline(findings, { entries: [] })).toEqual({ findings, accepted: 0, stale: [] });
  });
});

describe("serializeBaseline", () => {
  it("writes one entry per Fingerprint with an empty Reason, never the value or the line", () => {
    const output = serializeBaseline([finding("src/a.ts"), finding("src/a.ts")]);
    expect(output.endsWith("}\n")).toBe(true);
    expect(JSON.parse(output)).toEqual({
      version: 1,
      findings: [
        {
          fingerprint: finding("src/a.ts").fingerprint,
          ruleId: "secret/github-token",
          path: "src/a.ts",
          reason: "",
        },
      ],
    });
    expect(output).not.toContain(value);
    expect(output).not.toContain("line");
    expect(output).not.toContain("***");
  });

  it("indents with two spaces", () => {
    expect(serializeBaseline([finding("src/a.ts")])).toMatch(
      /^\{\n {2}"version": 1,\n {2}"findings"/,
    );
  });

  it("omits the path of a Finding that has none", () => {
    const entries = writtenEntries(serializeBaseline([finding(undefined)]));
    expect(entries[0]).not.toHaveProperty("path");
  });

  it("sorts by rule id, then path, then fingerprint", () => {
    const other = { ...githubToken, id: "secret/aws-access-key" };
    const findings = [
      finding("src/b.ts"),
      createFinding({ rule: other, path: "src/z.ts", value: "x" }),
      finding("src/a.ts"),
    ];
    const entries = writtenEntries(serializeBaseline(findings));
    expect(entries.map((e) => `${e.ruleId} ${e.path ?? ""}`)).toEqual([
      "secret/aws-access-key src/z.ts",
      "secret/github-token src/a.ts",
      "secret/github-token src/b.ts",
    ]);
  });

  it("keeps the Reasons already written and drops stale entries", () => {
    const kept = finding("src/a.ts");
    const added = finding("src/b.ts");
    const previous: Baseline = {
      entries: [entry(kept.fingerprint, "Revoked key"), entry(FP_A, "Gone now")],
    };
    const entries = writtenEntries(serializeBaseline([kept, added], previous));
    expect(entries).toEqual([
      expect.objectContaining({ fingerprint: kept.fingerprint, reason: "Revoked key" }),
      expect.objectContaining({ fingerprint: added.fingerprint, reason: "" }),
    ]);
  });
});
