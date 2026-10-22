import { patternRule } from "../content-rule.js";

export const githubToken = patternRule({
  id: "secret/github-token",
  category: "secret",
  severity: "critical",
  title: "GitHub token",
  advice: "Revoke it in GitHub settings (Developer settings → Personal access tokens).",
  patterns: [/\bgh[pousr]_[A-Za-z0-9]{36,255}\b/, /\bgithub_pat_[A-Za-z0-9_]{82}\b/],
  publicPrefixes: ["ghp_", "gho_", "ghu_", "ghs_", "ghr_", "github_pat_"],
});

export const gitlabToken = patternRule({
  id: "secret/gitlab-token",
  category: "secret",
  severity: "critical",
  title: "GitLab personal access token",
  advice: "Revoke it in GitLab (User settings → Access tokens).",
  patterns: [/\bglpat-[A-Za-z0-9_-]{20,}/],
  publicPrefixes: ["glpat-"],
});
