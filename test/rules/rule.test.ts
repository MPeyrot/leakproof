import { describe, expect, it } from "vitest";
import { isAtLeast, parseSeverity } from "../../src/rules/rule.js";

describe("isAtLeast", () => {
  it("compares severities from critical down to low", () => {
    expect(isAtLeast("critical", "low")).toBe(true);
    expect(isAtLeast("high", "high")).toBe(true);
    expect(isAtLeast("medium", "high")).toBe(false);
    expect(isAtLeast("low", "critical")).toBe(false);
  });
});

describe("parseSeverity", () => {
  it("recognises the four severities", () => {
    expect(parseSeverity("critical")).toBe("critical");
    expect(parseSeverity("low")).toBe("low");
  });

  it("rejects anything else, including other cases", () => {
    expect(parseSeverity("Medium")).toBeUndefined();
    expect(parseSeverity("")).toBeUndefined();
    expect(parseSeverity("urgent")).toBeUndefined();
  });
});
