import { maskFully } from "../../scan/mask.js";
import { patternRule } from "../content-rule.js";

/**
 * French social security number: sex, year, month, department (2A/2B for Corsica), commune,
 * order, then a key equal to 97 minus the first 13 digits mod 97.
 */
export function hasValidNirKey(raw: string): boolean {
  const compact = raw.replace(/\s/g, "");
  const body = compact.slice(0, 13).replace("2A", "19").replace("2B", "18");
  const key = Number(compact.slice(13));
  return 97 - Number(BigInt(body) % 97n) === key;
}

export const nir = patternRule({
  id: "personal-data/nir",
  category: "personal-data",
  severity: "high",
  title: "French social security number (NIR)",
  advice: "Remove it from the files and the History: it identifies a person for life.",
  patterns: [
    /(?<![0-9A-Za-z])[12378] ?\d{2} ?(?:0[1-9]|1[0-2]|[2-9]\d) ?(?:\d{2}|2[AB]) ?\d{3} ?\d{3} ?\d{2}(?![0-9A-Za-z])/,
  ],
  mask: maskFully,
  accept: hasValidNirKey,
});
