import type { Masker } from "../../scan/mask.js";
import type { RuleMeta } from "../rule.js";

/** A Rule about the e-mail of a commit author or committer. */
export interface IdentityRule extends RuleMeta {
  readonly category: "git-identity";
  readonly mask: Masker;
  /** True when the e-mail breaks the Rule. */
  check(email: string): boolean;
}
