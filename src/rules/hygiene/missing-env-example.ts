import { isEnvTemplate } from "../file/env-file.js";
import { basename } from "../file/file-rule.js";
import type { RepoRule } from "./repo-rule.js";

/** A real env file (`.env`, `.env.local`), not a template nor a directory. */
function isLocalEnvFile(path: string): boolean {
  const name = basename(path);
  return name === ".env" || (name.startsWith(".env.") && !isEnvTemplate(name));
}

/**
 * Fires only when an env file actually sits on disk, ignored by git: ignoring `.env` as a
 * precaution, as every .gitignore should, is no sign that the project needs variables.
 */
export const missingEnvExample: RepoRule = {
  id: "hygiene/missing-env-example",
  category: "hygiene",
  severity: "low",
  title: "Env file used locally but no .env.example documents it",
  advice: "Commit a .env.example listing the variable names, without values, for new contributors.",
  check: ({ paths, gitIgnored }) =>
    [...gitIgnored].some(isLocalEnvFile) &&
    ![...paths].some((path) => isEnvTemplate(basename(path))),
};
