import { patternRule } from "../content-rule.js";

export const npmToken = patternRule({
  id: "secret/npm-token",
  category: "secret",
  severity: "critical",
  title: "npm access token",
  advice: "Revoke it with `npm token revoke` or on npmjs.com (Access Tokens).",
  patterns: [/\bnpm_[A-Za-z0-9]{36}\b/],
  publicPrefixes: ["npm_"],
});
