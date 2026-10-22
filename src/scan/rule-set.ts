import type { ContentRule } from "../rules/content-rule.js";
import { denylistRule } from "../rules/denylist/denylist-term.js";
import { trackedDenylist } from "../rules/denylist/tracked-denylist.js";
import { authorPersonalEmail } from "../rules/git-identity/personal-email.js";
import type { FileRule } from "../rules/file/file-rule.js";
import { FILE_RULES } from "../rules/file/index.js";
import { PERSONAL_DATA_RULES } from "../rules/personal-data/index.js";
import { SECRET_RULES } from "../rules/secret/index.js";

export interface RuleSet {
  readonly fileRules: readonly FileRule[];
  readonly contentRules: readonly ContentRule[];
}

const ALL_FILE_RULES: readonly FileRule[] = [...FILE_RULES, trackedDenylist];
const STATIC_CONTENT_RULES: readonly ContentRule[] = [...SECRET_RULES, ...PERSONAL_DATA_RULES];

/** Every Rule id a configuration may refer to. */
export const RULE_IDS: ReadonlySet<string> = new Set([
  ...ALL_FILE_RULES.map((rule) => rule.id),
  ...STATIC_CONTENT_RULES.map((rule) => rule.id),
  denylistRule([]).id,
  authorPersonalEmail.id,
]);

export function buildRuleSet(options: {
  denylist: readonly string[];
  disabledRules?: readonly string[];
}): RuleSet {
  const disabled = new Set(options.disabledRules ?? []);
  const enabled = (rule: { id: string }) => !disabled.has(rule.id);
  return {
    fileRules: ALL_FILE_RULES.filter(enabled),
    contentRules: [...STATIC_CONTENT_RULES, denylistRule(options.denylist)].filter(enabled),
  };
}
