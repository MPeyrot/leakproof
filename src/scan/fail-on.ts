import { isAtLeast, type Severity } from "../rules/rule.js";
import type { Finding } from "./finding.js";

/** True when at least one Finding is as serious as `threshold`, or more. */
export function failsOn(findings: readonly Finding[], threshold: Severity): boolean {
  return findings.some((finding) => isAtLeast(finding.severity, threshold));
}
