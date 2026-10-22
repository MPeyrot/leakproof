import type { Severity } from "../rules/rule.js";
import type { BaselineEntry } from "../scan/baseline.js";
import type { Finding } from "../scan/finding.js";

/** What a scan produced, after the Baseline was applied. */
export interface Report {
  /** The Findings the Baseline does not accept, in the order `scan()` returns them. */
  readonly findings: readonly Finding[];
  /** How many Findings the Baseline accepted. */
  readonly accepted: number;
  /** Baseline entries that match no Finding any more. */
  readonly stale: readonly BaselineEntry[];
  /** The Severity from which the scan fails. */
  readonly failOn: Severity;
}
