import { patternRule } from "../content-rule.js";

export const slackToken = patternRule({
  id: "secret/slack-token",
  category: "secret",
  severity: "critical",
  title: "Slack token or webhook URL",
  advice: "Revoke the token or regenerate the webhook in the Slack app settings.",
  patterns: [
    /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
    /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/,
  ],
  publicPrefixes: [
    "https://hooks.slack.com/services/",
    "xoxb-",
    "xoxa-",
    "xoxp-",
    "xoxr-",
    "xoxs-",
  ],
});

export const sendgridKey = patternRule({
  id: "secret/sendgrid-key",
  category: "secret",
  severity: "critical",
  title: "SendGrid API key",
  advice: "Delete the key in SendGrid (Settings → API keys).",
  patterns: [/\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/],
  publicPrefixes: ["SG."],
});
