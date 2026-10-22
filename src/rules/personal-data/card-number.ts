import { maskCardNumber } from "../../scan/mask.js";
import { patternRule } from "../content-rule.js";

/** Card network prefixes and the lengths they issue. */
const NETWORKS: { prefix: RegExp; lengths: number[] }[] = [
  { prefix: /^4/, lengths: [13, 16, 19] }, // Visa
  { prefix: /^(?:5[1-5]|2[2-7])/, lengths: [16] }, // Mastercard
  { prefix: /^3[47]/, lengths: [15] }, // American Express
  { prefix: /^(?:6011|65|64[4-9])/, lengths: [16, 19] }, // Discover
  { prefix: /^35/, lengths: [16] }, // JCB
];

/** Numbers published by payment providers for testing; harmless in a repository. */
const TEST_CARDS = new Set([
  "4242424242424242",
  "4111111111111111",
  "4012888888881881",
  "4000056655665556",
  "5555555555554444",
  "5200828282828210",
  "5105105105105100",
  "378282246310005",
  "371449635398431",
  "6011111111111117",
  "3530111333300000",
]);

export function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function isCardNumber(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  const network = NETWORKS.find(({ prefix }) => prefix.test(digits));
  return (
    network !== undefined &&
    network.lengths.includes(digits.length) &&
    !TEST_CARDS.has(digits) &&
    passesLuhn(digits)
  );
}

export const cardNumber = patternRule({
  id: "personal-data/card-number",
  category: "personal-data",
  severity: "high",
  title: "Payment card number",
  advice: "Remove it from the files and the History; card numbers must never be stored in code.",
  patterns: [/(?<![0-9A-Za-z-])(?:\d[ -]?){12,18}\d(?![0-9A-Za-z-])/],
  mask: maskCardNumber,
  accept: isCardNumber,
});
