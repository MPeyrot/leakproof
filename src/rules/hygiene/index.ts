import { missingEnvExample } from "./missing-env-example.js";
import { missingGitignore } from "./missing-gitignore.js";
import { missingLicense } from "./missing-license.js";
import { missingReadme } from "./missing-readme.js";
import type { RepoRule } from "./repo-rule.js";

export const HYGIENE_RULES: readonly RepoRule[] = [
  missingGitignore,
  missingLicense,
  missingReadme,
  missingEnvExample,
];
