import { describe, expect, it } from "vitest";
import { maskCardNumber, maskEmail, maskFully, maskIban, maskSecret } from "../../src/scan/mask.js";
import { fake } from "../helpers/fake.js";

describe("maskSecret", () => {
  it("keeps a known public prefix and the last 4 characters of a long value", () => {
    const value = fake("AKIA", "TESTONLY", "EXAMPLE", "WXYZ");
    expect(maskSecret(value, "AKIA")).toBe("AKIA********WXYZ");
  });

  it("always uses exactly 8 stars, whatever the length", () => {
    expect(maskSecret("a".repeat(20))).toBe("********aaaa");
    expect(maskSecret("a".repeat(90))).toBe("********aaaa");
  });

  it("shows no suffix for values shorter than 20 characters", () => {
    expect(maskSecret("short-pass")).toBe("********");
    expect(maskSecret(fake("ghp_", "abc"), "ghp_")).toBe("ghp_********");
  });

  it("ignores a prefix the value does not start with", () => {
    expect(maskSecret("b".repeat(25), "AKIA")).toBe("********bbbb");
  });
});

describe("maskEmail", () => {
  it("keeps the first letter of the local part and domain, and the top-level domain", () => {
    expect(maskEmail(fake("jane.doe", "@", "example.org"))).toBe("j***@e***.org");
  });

  it("handles multi-level domains", () => {
    expect(maskEmail(fake("x", "@", "mail.example.co.uk"))).toBe("x***@m***.uk");
  });
});

describe("maskIban", () => {
  it("keeps the country, the check digits and the last 2 characters", () => {
    expect(maskIban(fake("FR76", "0000", "0000", "0000", "0000", "0000", "012"))).toBe(
      "FR76********12",
    );
  });

  it("ignores spaces", () => {
    expect(maskIban(fake("FR76 ", "0000 0000 0000 0000 0000 012"))).toBe("FR76********12");
  });
});

describe("maskFully", () => {
  it("never reveals anything", () => {
    expect(maskFully()).toBe("********");
  });
});

describe("maskCardNumber", () => {
  it("keeps only the last 4 digits", () => {
    expect(maskCardNumber(fake("4000 0000", " 0000 0002"))).toBe("********0002");
  });
});
