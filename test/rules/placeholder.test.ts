import { describe, expect, it } from "vitest";
import { shannonEntropy } from "../../src/rules/entropy.js";
import { isPlaceholder } from "../../src/rules/placeholder.js";

describe("isPlaceholder", () => {
  it.each([
    "changeme",
    "CHANGE_ME",
    "your-api-key",
    "YOUR_TOKEN_HERE",
    "<password>",
    "${DB_PASSWORD}",
    "{{ secrets.TOKEN }}",
    "%(password)s",
    "$API_KEY",
    "%API_KEY%",
    "process.env.API_KEY",
    "xxxxxxxxxxxx",
    "************",
    "aaaaaaaaaaaa",
    "example-secret",
    "placeholder",
    "dummy-token",
    "redacted",
    "insert_key_here",
  ])("treats %s as a placeholder", (value) => {
    expect(isPlaceholder(value)).toBe(true);
  });

  it.each(["TESTONLY9fQ2zLk", "k3Rz9-Qa7Lm2", "hunter2-but-longer"])(
    "treats %s as a possible secret",
    (value) => {
      expect(isPlaceholder(value)).toBe(false);
    },
  );
});

describe("shannonEntropy", () => {
  it("is 0 for a single repeated character", () => {
    expect(shannonEntropy("aaaa")).toBe(0);
  });

  it("is 1 bit per character for two balanced symbols", () => {
    expect(shannonEntropy("abab")).toBe(1);
  });

  it("is higher for varied strings", () => {
    expect(shannonEntropy("k3Rz9-Qa7Lm2")).toBeGreaterThan(3);
  });
});
