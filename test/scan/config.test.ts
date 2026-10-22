import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONFIG_FILE, ConfigError, loadConfig, parseConfig } from "../../src/scan/config.js";
import { DEFAULT_SETTINGS } from "../../src/scan/settings.js";

const parse = (value: unknown) => parseConfig(JSON.stringify(value), CONFIG_FILE);

function messageOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigError);
    return (error as Error).message;
  }
  throw new Error("expected a ConfigError");
}

describe("parseConfig", () => {
  it("returns the defaults for an empty object", () => {
    expect(parse({})).toEqual({
      failOn: "low",
      ignoredPaths: [],
      disabledRules: [],
      settings: DEFAULT_SETTINGS,
    });
  });

  it("reads every key", () => {
    const config = parse({
      failOn: "medium",
      ignoredPaths: [{ pattern: "test/fixtures/**", reason: "Synthetic secrets for the tests" }],
      disabledRules: [{ id: "hygiene/missing-license", reason: "Internal tool" }],
      maxScanFileSize: 2048,
      largeFileThreshold: 4096,
    });
    expect(config).toEqual({
      failOn: "medium",
      ignoredPaths: [{ pattern: "test/fixtures/**", reason: "Synthetic secrets for the tests" }],
      disabledRules: [{ id: "hygiene/missing-license", reason: "Internal tool" }],
      settings: { maxScanFileSize: 2048, largeFileThreshold: 4096 },
    });
  });

  it("rejects invalid JSON, naming the file", () => {
    expect(messageOf(() => parseConfig("{nope", "custom.json"))).toMatch(
      /^custom\.json: invalid JSON/,
    );
  });

  it("rejects a top level that is not an object", () => {
    expect(messageOf(() => parse([]))).toBe(`${CONFIG_FILE}: the top level must be an object`);
    expect(messageOf(() => parse("low"))).toMatch(/top level/);
    expect(messageOf(() => parse(null))).toMatch(/top level/);
  });

  it("rejects unknown keys", () => {
    expect(messageOf(() => parse({ failon: "high" }))).toMatch(/unknown key "failon"/);
  });

  it("explains why the Denylist cannot be set here", () => {
    const message = messageOf(() => parse({ denylist: ["Acme"] }));
    expect(message).toMatch(/\.leakproofrc\.json: the Denylist cannot be set here/);
    expect(message).toMatch(/\.leakproof-denylist/);
    expect(message).toMatch(/LEAKPROOF_DENYLIST/);
  });

  it("rejects an unknown or mistyped failOn", () => {
    expect(messageOf(() => parse({ failOn: "urgent" }))).toBe(
      `${CONFIG_FILE}: failOn must be one of critical, high, medium, low`,
    );
    expect(messageOf(() => parse({ failOn: 3 }))).toMatch(/failOn must be one of/);
  });

  it("rejects wrong types for the lists", () => {
    expect(messageOf(() => parse({ ignoredPaths: "docs" }))).toBe(
      `${CONFIG_FILE}: ignoredPaths must be an array`,
    );
    expect(messageOf(() => parse({ disabledRules: ["hygiene/missing-license"] }))).toBe(
      `${CONFIG_FILE}: disabledRules[0] must be an object`,
    );
  });

  it("rejects unknown keys inside an entry", () => {
    const entry = { pattern: "docs", reason: "Docs", note: "x" };
    expect(messageOf(() => parse({ ignoredPaths: [entry] }))).toMatch(
      /ignoredPaths\[0\]\.note is not a known key/,
    );
  });

  it("rejects an empty pattern", () => {
    expect(messageOf(() => parse({ ignoredPaths: [{ pattern: " ", reason: "x" }] }))).toBe(
      `${CONFIG_FILE}: ignoredPaths[0].pattern must be a non-empty string`,
    );
  });

  it("requires a Reason on every ignored path and disabled Rule", () => {
    expect(messageOf(() => parse({ ignoredPaths: [{ pattern: "docs" }] }))).toBe(
      `${CONFIG_FILE}: ignoredPaths[0].reason must be a non-empty string`,
    );
    const rules = [
      { id: "hygiene/missing-license", reason: "Internal tool" },
      { id: "hygiene/missing-readme", reason: "  " },
    ];
    expect(messageOf(() => parse({ disabledRules: rules }))).toBe(
      `${CONFIG_FILE}: disabledRules[1].reason must be a non-empty string`,
    );
  });

  it("rejects an unknown Rule id", () => {
    expect(
      messageOf(() => parse({ disabledRules: [{ id: "secret/nope", reason: "Because" }] })),
    ).toBe(`${CONFIG_FILE}: disabledRules[0].id is unknown: secret/nope`);
  });

  it("accepts the git identity Rule id", () => {
    expect(
      parse({ disabledRules: [{ id: "git-identity/personal-email", reason: "Team policy" }] })
        .disabledRules,
    ).toHaveLength(1);
  });

  it("rejects sizes that are not positive integers", () => {
    for (const value of [0, -1, 1.5, "10", null]) {
      expect(messageOf(() => parse({ maxScanFileSize: value }))).toBe(
        `${CONFIG_FILE}: maxScanFileSize must be a positive integer`,
      );
    }
    expect(messageOf(() => parse({ largeFileThreshold: 0 }))).toMatch(/largeFileThreshold/);
  });
});

describe("loadConfig", () => {
  let dir: string;
  let repoRoot: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "leakproof-config-"));
    repoRoot = join(dir, "repo");
    mkdirSync(repoRoot);
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("uses the defaults without a file at the default path", () => {
    expect(loadConfig({ repoRoot, cwd: dir }).failOn).toBe("low");
  });

  it("reads the default file from the repository root", () => {
    writeFileSync(join(repoRoot, CONFIG_FILE), '{ "failOn": "high" }');
    expect(loadConfig({ repoRoot, cwd: dir }).failOn).toBe("high");
  });

  it("reads an explicit path relative to the working directory", () => {
    writeFileSync(join(dir, "other.json"), '{ "failOn": "critical" }');
    writeFileSync(join(repoRoot, CONFIG_FILE), '{ "failOn": "high" }');
    expect(loadConfig({ repoRoot, cwd: dir, path: "other.json" }).failOn).toBe("critical");
  });

  it("fails when an explicit path does not exist", () => {
    expect(messageOf(() => loadConfig({ repoRoot, cwd: dir, path: "missing.json" }))).toBe(
      "missing.json: file not found",
    );
  });

  it("names the file in validation errors", () => {
    writeFileSync(join(repoRoot, CONFIG_FILE), '{ "failOn": "x" }');
    expect(messageOf(() => loadConfig({ repoRoot, cwd: dir }))).toMatch(/^\.leakproofrc\.json: /);
  });
});
