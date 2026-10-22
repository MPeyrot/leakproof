import type { RepoRule } from "./repo-rule.js";

/** The places GitHub renders a README from. */
const README = /^(\.github\/|docs\/)?readme(\.[^/]*)?$/i;

export const missingReadme: RepoRule = {
  id: "hygiene/missing-readme",
  category: "hygiene",
  severity: "low",
  title: "No README",
  advice:
    "Add a README at the root (or in .github/ or docs/) saying what the project is and how to use it.",
  check: ({ paths }) => ![...paths].some((path) => README.test(path)),
};
