import { patternRule } from "../content-rule.js";

/** Test-mode keys (`sk_test_`) give no access to money and are deliberately not reported. */
export const stripeLiveKey = patternRule({
  id: "secret/stripe-live-key",
  category: "secret",
  severity: "critical",
  title: "Stripe live secret key",
  advice: "Roll the key in the Stripe dashboard (Developers → API keys).",
  patterns: [/\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/],
  publicPrefixes: ["sk_live_", "rk_live_"],
});

/** OpenAI keys embed `T3BlbkFJ`, base64 for "OpenAI", which keeps this Rule precise. */
export const openaiKey = patternRule({
  id: "secret/openai-key",
  category: "secret",
  severity: "critical",
  title: "OpenAI API key",
  advice: "Revoke it at platform.openai.com (API keys).",
  patterns: [/\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}T3BlbkFJ[A-Za-z0-9_-]{20,}/],
  publicPrefixes: ["sk-proj-", "sk-svcacct-", "sk-admin-", "sk-"],
});

export const anthropicKey = patternRule({
  id: "secret/anthropic-key",
  category: "secret",
  severity: "critical",
  title: "Anthropic API key",
  advice: "Revoke it in the Claude Console (API keys).",
  patterns: [/\bsk-ant-[a-z]+\d*-[A-Za-z0-9_-]{32,}/],
  publicPrefixes: ["sk-ant-"],
});
