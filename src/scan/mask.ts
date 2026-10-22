// Masking rules, see docs/adr/0001-mask-values-at-detection.md.

const STARS = "********";
const MIN_LENGTH_FOR_SUFFIX = 20;
const SUFFIX_LENGTH = 4;

/** Turns a raw matched value into its only displayable form. */
export type Masker = (raw: string) => string;

/**
 * Shows the provider's public prefix (when the value starts with it), a fixed run of stars
 * that hides the length, and the last 4 characters only for values of 20 characters or more.
 */
export function maskSecret(raw: string, publicPrefix = ""): string {
  const prefix = publicPrefix !== "" && raw.startsWith(publicPrefix) ? publicPrefix : "";
  const suffix = raw.length >= MIN_LENGTH_FOR_SUFFIX ? raw.slice(-SUFFIX_LENGTH) : "";
  return `${prefix}${STARS}${suffix}`;
}

/** `jane.doe@mail.example.org` becomes `j***@m***.org`. */
export function maskEmail(raw: string): string {
  const at = raw.lastIndexOf("@");
  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  const lastDot = domain.lastIndexOf(".");
  const tld = lastDot === -1 ? "" : domain.slice(lastDot);
  return `${local.charAt(0)}***@${domain.charAt(0)}***${tld}`;
}

/** Keeps the country code, the check digits and the last 2 characters. */
export function maskIban(raw: string): string {
  const compact = raw.replace(/\s/g, "");
  return `${compact.slice(0, 4)}${STARS}${compact.slice(-2)}`;
}

/** Keeps the last 4 digits, as printed on receipts. */
export function maskCardNumber(raw: string): string {
  return `${STARS}${raw.replace(/\D/g, "").slice(-SUFFIX_LENGTH)}`;
}

/** For values where any visible character is too much (a NIR, for instance). */
export function maskFully(): string {
  return STARS;
}
