import type { RepoRule } from "./repo-rule.js";

export const missingGitignore: RepoRule = {
  id: "hygiene/missing-gitignore",
  category: "hygiene",
  severity: "medium",
  title: "No .gitignore at the root",
  advice: "Add a .gitignore so that env files, build output and editor files are never committed.",
  check: ({ paths }) => !paths.has(".gitignore"),
};
