import { maskEmail } from "../../scan/mask.js";
import { isPersonalEmail } from "../personal-data/personal-email.js";
import type { IdentityRule } from "./identity-rule.js";

export const authorPersonalEmail: IdentityRule = {
  id: "git-identity/personal-email",
  category: "git-identity",
  severity: "medium",
  title: "Personal e-mail in commit author or committer",
  advice:
    "Commit with your GitHub noreply address (git config user.email <id>+<login>@users.noreply.github.com) and rewrite past commits with git filter-repo --mailmap before publishing.",
  mask: maskEmail,
  check: isPersonalEmail,
};
