import { describe, expect, it } from "vitest";
import type { Severity } from "../../src/rules/rule.js";
import { failsOn } from "../../src/scan/fail-on.js";
import { fingerprint, type Finding } from "../../src/scan/finding.js";

function finding(severity: Severity): Finding {
  return {
    ruleId: "secret/example",
    category: "secret",
    severity,
    title: "Example",
    fingerprint: fingerprint("secret/example", "", severity),
  };
}

describe("failsOn", () => {
  it("fails when a Finding reaches the threshold", () => {
    expect(failsOn([finding("high")], "high")).toBe(true);
    expect(failsOn([finding("critical")], "medium")).toBe(true);
    expect(failsOn([finding("low")], "low")).toBe(true);
  });

  it("passes when every Finding is below the threshold", () => {
    expect(failsOn([finding("medium"), finding("low")], "high")).toBe(false);
  });

  it("passes without Findings", () => {
    expect(failsOn([], "low")).toBe(false);
  });
});
