import { describe, expect, it } from "vitest";
import type { ContentRule } from "../../src/rules/content-rule.js";
import { PERSONAL_DATA_RULES } from "../../src/rules/personal-data/index.js";
import { isPersonalEmail } from "../../src/rules/personal-data/personal-email.js";
import { syntheticIban, withLuhnDigit, withNirKey } from "../helpers/checksums.js";
import { fake } from "../helpers/fake.js";

function rule(id: string): ContentRule {
  const found = PERSONAL_DATA_RULES.find((r) => r.id === id);
  if (found === undefined) throw new Error(`no rule ${id}`);
  return found;
}

function values(id: string, content: string): string[] {
  return rule(id)
    .find(content)
    .map((match) => match.value);
}

function spaced(value: string, groups: number[]): string {
  const parts: string[] = [];
  let offset = 0;
  for (const size of groups) {
    parts.push(value.slice(offset, offset + size));
    offset += size;
  }
  return parts.join(" ");
}

describe("personal data rules", () => {
  it("are all in the personal-data category", () => {
    for (const r of PERSONAL_DATA_RULES) expect(r.category).toBe("personal-data");
  });
});

describe("personal-data/iban", () => {
  const iban = syntheticIban("FR", "00000000000000000000123");

  it("finds a valid IBAN, compact or grouped by 4", () => {
    expect(values("personal-data/iban", `IBAN: ${iban}`)).toEqual([iban]);
    const grouped = iban.replace(/(.{4})(?!$)/g, "$1 ");
    expect(values("personal-data/iban", `IBAN: ${grouped}`)).toEqual([grouped]);
  });

  it("ignores a string with the IBAN shape but a wrong checksum", () => {
    const broken = `${iban.slice(0, 2)}${iban[2] === "9" ? "0" : "9"}${iban.slice(3)}`;
    expect(values("personal-data/iban", broken)).toEqual([]);
  });

  it("ignores identifiers that only look alike", () => {
    expect(values("personal-data/iban", "SKU AB12CDEF3456GHIJ")).toEqual([]);
  });

  it("masks all but the country, check digits and last 2 characters", () => {
    expect(rule("personal-data/iban").mask(iban)).toBe(`${iban.slice(0, 4)}********23`);
  });
});

describe("personal-data/card-number", () => {
  const visa = withLuhnDigit("400000123456789");
  const amex = withLuhnDigit("37000012345678");

  it("finds Luhn-valid numbers with a card network prefix", () => {
    expect(values("personal-data/card-number", `card ${visa}`)).toEqual([visa]);
    const grouped = spaced(visa, [4, 4, 4, 4]);
    expect(values("personal-data/card-number", `card ${grouped}`)).toEqual([grouped]);
    expect(values("personal-data/card-number", amex)).toEqual([amex]);
  });

  it("ignores numbers failing the Luhn check", () => {
    const wrong = `${visa.slice(0, -1)}${String((Number(visa.slice(-1)) + 1) % 10)}`;
    expect(values("personal-data/card-number", wrong)).toEqual([]);
  });

  it("ignores Luhn-valid numbers without a card network prefix", () => {
    expect(values("personal-data/card-number", withLuhnDigit("900000123456789"))).toEqual([]);
  });

  it("ignores well-known test card numbers", () => {
    expect(values("personal-data/card-number", "4242 4242 4242 4242")).toEqual([]);
    expect(values("personal-data/card-number", "4111111111111111")).toEqual([]);
  });

  it("ignores digits inside longer identifiers", () => {
    expect(values("personal-data/card-number", `id-${visa}0`)).toEqual([]);
    expect(values("personal-data/card-number", `sha ab${visa}cd`)).toEqual([]);
  });
});

describe("personal-data/nir", () => {
  const nir = withNirKey("2990199999999");
  const corsican = withNirKey("199012A999999");

  it("finds a NIR with a valid key, compact or spaced", () => {
    expect(values("personal-data/nir", `NIR ${nir}`)).toEqual([nir]);
    const grouped = spaced(nir, [1, 2, 2, 2, 3, 3, 2]);
    expect(values("personal-data/nir", grouped)).toEqual([grouped]);
  });

  it("handles Corsican departments", () => {
    expect(values("personal-data/nir", corsican)).toEqual([corsican]);
  });

  it("ignores a NIR with a wrong key", () => {
    const wrong = `${nir.slice(0, 13)}${nir.slice(13) === "01" ? "02" : "01"}`;
    expect(values("personal-data/nir", wrong)).toEqual([]);
  });

  it("ignores 15-digit numbers that are not NIR-shaped", () => {
    expect(values("personal-data/nir", "500000000000000")).toEqual([]);
  });

  it("is fully masked", () => {
    expect(rule("personal-data/nir").mask(nir)).toBe("********");
  });
});

describe("personal-data/personal-email", () => {
  const address = fake("fixture.not.real", "@", "gmail.com");

  it("finds addresses at consumer mailbox providers", () => {
    expect(values("personal-data/personal-email", `contact: ${address}`)).toEqual([address]);
    const french = fake("fixture.not.real", "@", "orange.fr");
    expect(values("personal-data/personal-email", french)).toEqual([french]);
  });

  it("ignores company, noreply and example addresses", () => {
    expect(values("personal-data/personal-email", "contact@company.example")).toEqual([]);
    expect(values("personal-data/personal-email", fake("noreply", "@", "gmail.com"))).toEqual([]);
    expect(
      values("personal-data/personal-email", "12345+someone@users.noreply.github.com"),
    ).toEqual([]);
  });

  it("does not match a provider name inside a longer domain", () => {
    expect(
      values("personal-data/personal-email", fake("a", "@", "gmail.com.example.test")),
    ).toEqual([]);
  });

  it("masks the address", () => {
    expect(rule("personal-data/personal-email").mask(address)).toBe("f***@g***.com");
  });

  it("exposes the definition for other rules", () => {
    expect(isPersonalEmail(address)).toBe(true);
    expect(isPersonalEmail("dev@company.example")).toBe(false);
  });
});

describe("personal-data/user-path", () => {
  it.each([
    [fake("/Us", "ers/", "fixtureuser", "/project/src"), fake("/Us", "ers/", "fixtureuser")],
    [fake("/ho", "me/", "fixtureuser", "/.config"), fake("/ho", "me/", "fixtureuser")],
    [
      fake("C:", "\\", "Users\\", "fixtureuser\\Desktop"),
      fake("C:", "\\", "Users\\", "fixtureuser"),
    ],
    [
      fake('"C:', "\\\\", "Users\\\\", 'fixtureuser\\\\app"'),
      fake("C:", "\\\\", "Users\\\\", "fixtureuser"),
    ],
  ])("finds the user name in %s", (content, expected) => {
    expect(values("personal-data/user-path", content)).toEqual([expected]);
  });

  it.each([
    fake("/Us", "ers/", "Shared/file"),
    fake("/ho", "me/", "runner/work/repo"),
    fake("/ho", "me/", "user/app"),
    fake("/Us", "ers/", "<you>/project"),
    fake("/Us", "ers/", "$USER/project"),
    "https://example.test/home/about",
    "GET /api/Users/42",
  ])("ignores %s", (content) => {
    expect(values("personal-data/user-path", content)).toEqual([]);
  });

  it("masks the user name", () => {
    expect(rule("personal-data/user-path").mask(fake("/Us", "ers/", "fixtureuser"))).toBe(
      fake("/Us", "ers/", "f***"),
    );
  });
});
