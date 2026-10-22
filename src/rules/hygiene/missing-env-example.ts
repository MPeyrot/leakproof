import { isEnvTemplate } from "../file/env-file.js";
import { basename } from "../file/file-rule.js";
import type { RepoRule } from "./repo-rule.js";

const ENV_PATTERNS = new Set([".env", ".env*", ".env.*", "*.env", ".env.local"]);

/** True when the `.gitignore` has a plain, non-negated line ignoring env files. */
function ignoresEnvFiles(gitignore: string): boolean {
  return gitignore.split(/\r?\n/).some((raw) => {
    const line = raw.trim();
    if (line === "" || line.startsWith("#") || line.startsWith("!")) return false;
    return ENV_PATTERNS.has(line.replace(/^(\*\*\/|\/)/, ""));
  });
}

export const missingEnvExample: RepoRule = {
  id: "hygiene/missing-env-example",
  category: "hygiene",
  severity: "low",
  title: "Env files are ignored but no .env.example documents them",
  advice: "Commit a .env.example listing the variable names, without values, for new contributors.",
  check: ({ paths, gitignore }) =>
    gitignore !== undefined &&
    ignoresEnvFiles(gitignore) &&
    ![...paths].some((path) => isEnvTemplate(basename(path))),
};
