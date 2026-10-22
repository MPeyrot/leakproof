import { SEVERITIES } from "../rules/rule.js";
import type { Report } from "./report.js";

const FORMAT_VERSION = 1;

/** The machine-readable report. Findings are serialized as they are: they hold no raw value. */
export function formatJson(report: Report): string {
  const bySeverity = Object.fromEntries(
    SEVERITIES.map((severity) => [
      severity,
      report.findings.filter((finding) => finding.severity === severity).length,
    ]),
  );
  return `${JSON.stringify(
    {
      version: FORMAT_VERSION,
      failOn: report.failOn,
      findings: report.findings,
      summary: {
        total: report.findings.length,
        bySeverity,
        accepted: report.accepted,
        staleBaselineEntries: report.stale.length,
      },
    },
    null,
    2,
  )}\n`;
}
