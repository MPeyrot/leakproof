import { patternRule } from "../content-rule.js";

// These formats are sometimes meant to ship in client code (Firebase web keys, Supabase anon
// keys), so they are high rather than critical, and the advice says how to tell.

export const googleApiKey = patternRule({
  id: "secret/google-api-key",
  category: "secret",
  severity: "high",
  title: "Google API key",
  advice:
    "Firebase web keys are public by design but must be restricted in Google Cloud; any other key should be rotated.",
  patterns: [/\bAIza[0-9A-Za-z_-]{35}\b/],
  publicPrefixes: ["AIza"],
});

export const jwt = patternRule({
  id: "secret/jwt",
  category: "secret",
  severity: "high",
  title: "JSON Web Token",
  advice:
    "A Supabase anon key is public by design; a service-role key or session token must be revoked.",
  patterns: [/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  publicPrefixes: ["eyJ"],
});
