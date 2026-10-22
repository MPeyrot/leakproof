import { maskIban } from "../../scan/mask.js";
import { patternRule } from "../content-rule.js";

/** ISO 13616 check: move the first 4 characters to the end, letters become 10–35, mod 97 = 1. */
export function isValidIban(raw: string): boolean {
  const compact = raw.replace(/\s/g, "");
  if (compact.length < 15 || compact.length > 34) return false;
  const rearranged = `${compact.slice(4)}${compact.slice(0, 4)}`;
  let remainder = 0;
  for (const char of rearranged) {
    const digits = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55);
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

export const iban = patternRule({
  id: "personal-data/iban",
  category: "personal-data",
  severity: "high",
  title: "Bank account number (IBAN)",
  advice: "Remove it unless it is meant to be public (an invoice template, for instance).",
  patterns: [/(?<![A-Za-z0-9])[A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,30}(?![A-Za-z0-9])/],
  mask: maskIban,
  accept: isValidIban,
});
