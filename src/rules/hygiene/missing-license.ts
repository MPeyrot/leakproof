import type { RepoRule } from "./repo-rule.js";

const LICENSE_NAME = /^(license|licence|copying|unlicense)($|[.-])/i;

export const missingLicense: RepoRule = {
  id: "hygiene/missing-license",
  category: "hygiene",
  severity: "low",
  title: "No LICENSE file at the root",
  advice:
    "Add a LICENSE file: without a licence nobody may legally reuse the code (choosealicense.com).",
  check: ({ paths }) => ![...paths].some((path) => !path.includes("/") && LICENSE_NAME.test(path)),
};
