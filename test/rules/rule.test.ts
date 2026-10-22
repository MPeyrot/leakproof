import { describe, expect, it } from "vitest";
import { isAtLeast } from "../../src/rules/rule.js";

describe("isAtLeast", () => {
  it("compares severities from critical down to low", () => {
    expect(isAtLeast("critical", "low")).toBe(true);
    expect(isAtLeast("high", "high")).toBe(true);
    expect(isAtLeast("medium", "high")).toBe(false);
    expect(isAtLeast("low", "critical")).toBe(false);
  });
});
