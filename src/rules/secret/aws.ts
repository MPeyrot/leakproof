import { patternRule } from "../content-rule.js";

export const awsAccessKeyId = patternRule({
  id: "secret/aws-access-key-id",
  category: "secret",
  severity: "critical",
  title: "AWS access key ID",
  advice: "Deactivate the key in IAM; its secret access key is probably nearby.",
  patterns: [/\b(?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/],
  publicPrefixes: ["AKIA", "ASIA", "ABIA", "ACCA"],
});

export const awsSecretAccessKey = patternRule({
  id: "secret/aws-secret-access-key",
  category: "secret",
  severity: "critical",
  title: "AWS secret access key",
  advice: "Deactivate the key pair in IAM and create a new one.",
  patterns: [
    /aws_?secret_?access_?key["']?\s*(?:[:=]|=>)\s*["']?(?<value>[A-Za-z0-9/+]{40})(?![A-Za-z0-9/+])/i,
  ],
});
