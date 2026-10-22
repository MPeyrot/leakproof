import { basename, type FileRule } from "./file-rule.js";

export const terraformState: FileRule = {
  id: "sensitive-file/terraform-state",
  category: "sensitive-file",
  severity: "critical",
  title: "Terraform state committed",
  advice: "Terraform state stores resource secrets in plain text; keep it in a remote backend.",
  check: ({ path }) => {
    const name = basename(path);
    return name.endsWith(".tfstate") || name.endsWith(".tfstate.backup") ? path : undefined;
  },
};
