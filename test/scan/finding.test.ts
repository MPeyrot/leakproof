import { describe, expect, it } from "vitest";
import type { RuleMeta } from "../../src/rules/rule.js";
import { createFinding, fingerprint } from "../../src/scan/finding.js";
import { maskSecret } from "../../src/scan/mask.js";
import { fake } from "../helpers/fake.js";

const rule: RuleMeta = {
  id: "secret/test-token",
  category: "secret",
  severity: "critical",
  title: "Test token",
};

describe("createFinding", () => {
  const value = fake("tok_", "TESTONLY", "0123456789", "abcdef");

  const finding = createFinding({
    rule,
    path: "src/config.ts",
    line: 12,
    commit: "abc1234",
    value,
    mask: (raw) => maskSecret(raw, "tok_"),
  });

  it("copies the rule metadata and location", () => {
    expect(finding).toMatchObject({
      ruleId: "secret/test-token",
      category: "secret",
      severity: "critical",
      title: "Test token",
      path: "src/config.ts",
      line: 12,
      commit: "abc1234",
    });
  });

  it("carries only the masked value", () => {
    expect(finding.maskedValue).toBe("tok_********cdef");
  });

  it("never contains the raw value anywhere, even serialized", () => {
    expect(JSON.stringify(finding)).not.toContain(value);
    expect(JSON.stringify(finding)).not.toContain("TESTONLY0123456789");
  });

  it("omits the masked value for findings without a value", () => {
    const fileFinding = createFinding({ rule, path: ".env" });
    expect(fileFinding).not.toHaveProperty("maskedValue");
    expect(fileFinding).not.toHaveProperty("line");
  });
});

describe("fingerprint", () => {
  it("is 16 hex characters", () => {
    expect(fingerprint("rule", "path", "value")).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is stable and does not depend on line or commit", () => {
    const a = createFinding({ rule, path: "a.ts", line: 1, commit: "c1", value: "v" });
    const b = createFinding({ rule, path: "a.ts", line: 99, commit: "c2", value: "v" });
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  it("changes with the rule, the path or the value", () => {
    const base = fingerprint("r", "p", "v");
    expect(fingerprint("r2", "p", "v")).not.toBe(base);
    expect(fingerprint("r", "p2", "v")).not.toBe(base);
    expect(fingerprint("r", "p", "v2")).not.toBe(base);
  });

  it("cannot be forged by shifting characters between fields", () => {
    expect(fingerprint("ab", "c", "")).not.toBe(fingerprint("a", "bc", ""));
  });
});
