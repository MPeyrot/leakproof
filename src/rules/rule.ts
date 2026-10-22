/** Ordered from most to least serious. */
export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

export type Category =
  "sensitive-file" | "secret" | "personal-data" | "denylist" | "git-identity" | "hygiene";

/** What every Rule declares about itself, independently of how it detects. */
export interface RuleMeta {
  /** Stable identifier, `<category>/<name>`, used in reports, configuration and Baselines. */
  readonly id: string;
  readonly category: Category;
  readonly severity: Severity;
  /** Short human description of what was found. */
  readonly title: string;
  /** What to do about it, when it is not obvious. */
  readonly advice?: string;
}

export function isAtLeast(severity: Severity, threshold: Severity): boolean {
  return SEVERITIES.indexOf(severity) <= SEVERITIES.indexOf(threshold);
}
