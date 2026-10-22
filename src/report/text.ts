import { SEVERITIES, type Severity } from "../rules/rule.js";
import type { Finding } from "../scan/finding.js";
import { printable } from "./printable.js";
import type { Report } from "./report.js";

export interface TextOptions {
  /** Colour the Severity labels with ANSI escapes. */
  readonly color: boolean;
}

const COLORS: Record<Severity, string> = {
  critical: "\x1b[31m",
  high: "\x1b[31m",
  medium: "\x1b[33m",
  low: "\x1b[2m",
};
const RESET = "\x1b[0m";

const LABEL_WIDTH = 10;
const COMMIT_LENGTH = 8;

function location(finding: Finding): string | undefined {
  const where =
    finding.path === undefined
      ? undefined
      : finding.line === undefined
        ? finding.path
        : `${finding.path}:${String(finding.line)}`;
  const parts = [where, finding.maskedValue].filter((part) => part !== undefined);
  return parts.length === 0 ? undefined : printable(parts.join("  "));
}

function block(finding: Finding, color: boolean): string {
  const label = finding.severity.toUpperCase();
  const shown = color ? `${COLORS[finding.severity]}${label}${RESET}` : label;
  const indent = " ".repeat(LABEL_WIDTH);
  const lines = [
    `${shown}${" ".repeat(LABEL_WIDTH - label.length)}${finding.ruleId}`,
    location(finding),
    finding.title,
    finding.advice,
    finding.commit === undefined
      ? undefined
      : `Introduced in commit ${finding.commit.slice(0, COMMIT_LENGTH)}`,
  ];
  return lines
    .filter((line) => line !== undefined)
    .map((line, index) => (index === 0 ? line : `${indent}${line}`))
    .join("\n");
}

function summary(report: Report): string {
  const { findings, accepted } = report;
  const counts = SEVERITIES.map((severity) => ({
    severity,
    count: findings.filter((finding) => finding.severity === severity).length,
  }))
    .filter(({ count }) => count > 0)
    .map(({ severity, count }) => `${String(count)} ${severity}`);
  const head =
    findings.length === 0
      ? "No Finding."
      : `${String(findings.length)} ${findings.length === 1 ? "Finding" : "Findings"}: ${counts.join(", ")}.`;
  return accepted === 0 ? head : `${head} ${String(accepted)} accepted by the Baseline.`;
}

/** The human-readable report: one block per Finding, then a summary line. */
export function formatText(report: Report, options: TextOptions): string {
  const blocks = report.findings.map((finding) => `${block(finding, options.color)}\n\n`);
  return `${blocks.join("")}${summary(report)}\n`;
}
