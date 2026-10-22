import { maskEmail } from "../../scan/mask.js";
import type { RuleMeta } from "../rule.js";

export const authorPersonalEmail: RuleMeta & { readonly mask: typeof maskEmail } = {
  id: "git-identity/personal-email",
  category: "git-identity",
  severity: "medium",
  title: "Personal e-mail in commit author or committer",
  advice:
    "Commit with your GitHub noreply address (git config user.email <id>+<login>@users.noreply.github.com) and rewrite past commits with git filter-repo --mailmap before publishing.",
  mask: maskEmail,
};
