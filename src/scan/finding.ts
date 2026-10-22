import { createHash } from "node:crypto";
import type { Category, RuleMeta, Severity } from "../rules/rule.js";
import { maskSecret, type Masker } from "./mask.js";

/**
 * One occurrence of a Rule at a location. It deliberately has no field for the raw matched
 * value: only its Masked value and Fingerprint survive detection (docs/adr/0001).
 */
export interface Finding {
  readonly ruleId: string;
  readonly category: Category;
  readonly severity: Severity;
  readonly title: string;
  readonly advice?: string;
  /** Repository-relative path, absent for repository-wide Findings. */
  readonly path?: string;
  /** 1-based line number, absent for Findings about a whole file. */
  readonly line?: number;
  /** Commit that introduced the content, for Findings from the History. */
  readonly commit?: string;
  readonly maskedValue?: string;
  readonly fingerprint: string;
}

export interface FindingInput {
  readonly rule: RuleMeta;
  readonly path?: string;
  readonly line?: number;
  readonly commit?: string;
  /** Raw matched value. Masked and fingerprinted here, then dropped. */
  readonly value?: string;
  readonly mask?: Masker;
}

export function createFinding(input: FindingInput): Finding {
  const { rule, path, line, commit, value, mask = (raw) => maskSecret(raw) } = input;
  return {
    ruleId: rule.id,
    category: rule.category,
    severity: rule.severity,
    title: rule.title,
    ...(rule.advice !== undefined && { advice: rule.advice }),
    ...(path !== undefined && { path }),
    ...(line !== undefined && { line }),
    ...(commit !== undefined && { commit }),
    ...(value !== undefined && { maskedValue: mask(value) }),
    fingerprint: fingerprint(rule.id, path ?? "", value ?? ""),
  };
}

/**
 * Identifies a Finding for the Baseline without containing its value (docs/adr/0006).
 * Line and commit are left out so that moved code keeps the same Fingerprint.
 */
export function fingerprint(ruleId: string, path: string, value: string): string {
  return createHash("sha256")
    .update(JSON.stringify([ruleId, path, value]))
    .digest("hex")
    .slice(0, 16);
}
