import { patternRule } from "../content-rule.js";
import { shannonEntropy } from "../entropy.js";

/** Names ending with one of these words hold secrets. `tokenizer` or `PASSWORD_MIN` do not. */
const KEY = String.raw`[A-Za-z0-9_.-]*(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|auth[_-]?key)`;
const ASSIGN = String.raw`\s*(?:=>|:=|[:=])\s*`;

const MIN_LENGTH = 8;
const VALUE_LENGTH = `{${String(MIN_LENGTH)},}`;
const MIN_ENTROPY = 3;

/** Member accesses and calls (`config.db.password`, `getToken()`) are code, not values. */
function isCodeReference(value: string): boolean {
  return /[()]/.test(value) || /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/.test(value);
}

/** Requires a mix of letters with digits, or of cases with symbols, as real secrets have. */
function looksRandom(value: string): boolean {
  const lettersAndDigits = /[A-Za-z]/.test(value) && /\d/.test(value);
  const mixedWithSymbols = /[a-z]/.test(value) && /[A-Z]/.test(value) && /[^A-Za-z0-9]/.test(value);
  return (lettersAndDigits || mixedWithSymbols) && shannonEntropy(value) >= MIN_ENTROPY;
}

export const keywordAssignment = patternRule({
  id: "secret/keyword-assignment",
  category: "secret",
  severity: "high",
  title: "Hard-coded secret assigned to a sensitive name",
  advice: "Move the value to an environment variable or a secret manager, and rotate it.",
  patterns: [
    // password = "value", "client_secret": "value", apiKey: 'value'
    new RegExp(`${KEY}["']?${ASSIGN}["'](?<value>[^"'\\s]${VALUE_LENGTH})["']`, "i"),
    // DB_PASSWORD=value at the start of a line (.env, shell, YAML)
    new RegExp(`^\\s*(?:export\\s+)?${KEY}${ASSIGN}(?<value>[^\\s"'#,;]${VALUE_LENGTH})`, "im"),
  ],
  accept: (value) => looksRandom(value) && !isCodeReference(value),
});
