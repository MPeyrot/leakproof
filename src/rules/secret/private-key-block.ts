import { patternRule } from "../content-rule.js";

const HEADER = String.raw`-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----`;
const FOOTER = String.raw`-----END (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----`;

export const privateKeyBlock = patternRule({
  id: "secret/private-key-block",
  category: "secret",
  severity: "critical",
  title: "Private key block",
  advice: "Revoke and replace the key, then remove it from the History.",
  patterns: [new RegExp(`${HEADER}(?:[\\s\\S]*?${FOOTER})?`)],
  // The header names the key type and is not secret; the body never shows.
  mask: (raw) => `${raw.split("\n", 1)[0] ?? ""}********`,
});
