import { basename, type FileRule } from "./file-rule.js";

export const gitCredentials: FileRule = {
  id: "sensitive-file/git-credentials",
  category: "sensitive-file",
  severity: "critical",
  title: "Git credential store committed",
  advice: "Remove it and revoke every token it contains.",
  check: ({ path }) => (basename(path) === ".git-credentials" ? path : undefined),
};
