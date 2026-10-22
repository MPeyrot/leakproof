import { patternRule } from "../content-rule.js";

export const credentialsInUrl = patternRule({
  id: "secret/credentials-in-url",
  category: "secret",
  severity: "critical",
  title: "Password in a URL",
  advice: "Change the password and pass credentials separately (environment variable).",
  // scheme://user:password@host — only the password is the value.
  patterns: [/\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@"'<>]+:(?<value>[^\s@/"'<>]+)@[^\s/"'<>]+/i],
});
