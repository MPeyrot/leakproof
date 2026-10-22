import { maskEmail } from "../../scan/mask.js";
import { patternRule } from "../content-rule.js";

/** Consumer mailbox providers: an address there belongs to a person, not a company. */
const CONSUMER_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "outlook.fr",
  "hotmail.com",
  "hotmail.fr",
  "live.com",
  "live.fr",
  "msn.com",
  "yahoo.com",
  "yahoo.fr",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.fr",
  "gmx.de",
  "free.fr",
  "orange.fr",
  "wanadoo.fr",
  "laposte.net",
  "sfr.fr",
  "neuf.fr",
  "bbox.fr",
]);

/** The project's definition of a Personal email (see CONTEXT.md). */
export function isPersonalEmail(address: string): boolean {
  const at = address.lastIndexOf("@");
  if (at <= 0) return false;
  const local = address.slice(0, at).toLowerCase();
  const domain = address.slice(at + 1).toLowerCase();
  return CONSUMER_DOMAINS.has(domain) && !/no-?reply|example/.test(local);
}

export const personalEmail = patternRule({
  id: "personal-data/personal-email",
  category: "personal-data",
  severity: "medium",
  title: "Personal e-mail address",
  advice: "Replace it with a role or project address, or remove it.",
  patterns: [/(?<![\w.%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]*[A-Za-z0-9]/],
  mask: maskEmail,
  accept: isPersonalEmail,
});
