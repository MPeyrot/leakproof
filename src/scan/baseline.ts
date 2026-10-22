import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Finding } from "./finding.js";

export const BASELINE_FILE = ".leakproof-baseline.json";

const VERSION = 1;
const FINGERPRINT_FORMAT = /^[0-9a-f]{16}$/;
const ENTRY_KEYS = ["fingerprint", "ruleId", "path", "reason"];

export class BaselineError extends Error {
  override name = "BaselineError";
}

/**
 * A Finding accepted on purpose. Only the Fingerprint is used for matching; `ruleId` and
 * `path` tell a human reviewer what the entry is. The masked value and line are never written.
 */
export interface BaselineEntry {
  readonly fingerprint: string;
  readonly ruleId: string;
  readonly path?: string;
  readonly reason: string;
}

export interface Baseline {
  readonly entries: readonly BaselineEntry[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEntry(item: unknown, source: string, index: number): BaselineEntry {
  const where = `findings[${String(index)}]`;
  if (!isObject(item)) throw new BaselineError(`${source}: ${where} must be an object`);
  for (const key of Object.keys(item)) {
    if (!ENTRY_KEYS.includes(key)) {
      throw new BaselineError(`${source}: ${where}.${key} is not a known key`);
    }
  }
  const { fingerprint, ruleId, path, reason } = item;
  if (typeof fingerprint !== "string" || !FINGERPRINT_FORMAT.test(fingerprint)) {
    throw new BaselineError(
      `${source}: ${where}.fingerprint must be 16 lowercase hexadecimal characters`,
    );
  }
  if (typeof ruleId !== "string" || ruleId === "") {
    throw new BaselineError(`${source}: ${where}.ruleId must be a non-empty string`);
  }
  if (path !== undefined && typeof path !== "string") {
    throw new BaselineError(`${source}: ${where}.path must be a string`);
  }
  if (typeof reason !== "string") {
    throw new BaselineError(`${source}: ${where}.reason must be a string`);
  }
  return { fingerprint, ruleId, ...(path !== undefined && { path }), reason };
}

/** Validates the text of a Baseline file. `source` names the file in error messages. */
export function parseBaseline(text: string, source: string): Baseline {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new BaselineError(`${source}: invalid JSON (${detail})`);
  }
  if (!isObject(raw)) throw new BaselineError(`${source}: the top level must be an object`);
  for (const key of Object.keys(raw)) {
    if (key !== "version" && key !== "findings") {
      throw new BaselineError(`${source}: unknown key "${key}"`);
    }
  }
  if (raw["version"] !== VERSION) {
    throw new BaselineError(`${source}: version must be ${String(VERSION)}`);
  }
  if (!Array.isArray(raw["findings"])) {
    throw new BaselineError(`${source}: findings must be an array`);
  }

  const entries = raw["findings"].map((item: unknown, index) => parseEntry(item, source, index));

  const seen = new Set<string>();
  for (const { fingerprint } of entries) {
    if (seen.has(fingerprint)) {
      throw new BaselineError(`${source}: duplicate fingerprint ${fingerprint}`);
    }
    seen.add(fingerprint);
  }

  const unjustified = entries.filter(({ reason }) => reason.trim() === "").length;
  if (unjustified > 0) {
    throw new BaselineError(
      `${source}: ${String(unjustified)} ${unjustified === 1 ? "entry has" : "entries have"} no Reason. ` +
        "Every accepted Finding needs a written justification in its reason field (docs/adr/0006)",
    );
  }
  return { entries };
}

/**
 * Reads the Baseline: the repository's `.leakproof-baseline.json` when there is one (an empty
 * Baseline otherwise), or `path` (relative to `cwd`), which must exist.
 */
export function loadBaseline(options: { repoRoot: string; cwd: string; path?: string }): Baseline {
  const { repoRoot, cwd, path } = options;
  const file = path === undefined ? join(repoRoot, BASELINE_FILE) : resolve(cwd, path);
  const source = path ?? BASELINE_FILE;
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
    if (missing && path === undefined) return { entries: [] };
    if (missing) throw new BaselineError(`${source}: file not found`);
    throw new BaselineError(`${source}: cannot read the file (${(error as Error).message})`);
  }
  return parseBaseline(text, source);
}

export interface BaselineResult {
  /** Findings the Baseline does not accept. */
  readonly findings: Finding[];
  /** How many Findings the Baseline accepted. */
  readonly accepted: number;
  /** Entries that match no Finding any more. */
  readonly stale: BaselineEntry[];
}

export function applyBaseline(findings: readonly Finding[], baseline: Baseline): BaselineResult {
  const accepted = new Set(baseline.entries.map((entry) => entry.fingerprint));
  const present = new Set(findings.map((finding) => finding.fingerprint));
  const remaining = findings.filter((finding) => !accepted.has(finding.fingerprint));
  return {
    findings: remaining,
    accepted: findings.length - remaining.length,
    stale: baseline.entries.filter((entry) => !present.has(entry.fingerprint)),
  };
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The text of a Baseline accepting every Finding. New entries get an empty Reason, which
 * `parseBaseline` refuses until someone writes one; Reasons already in `previous` are kept.
 */
export function serializeBaseline(findings: readonly Finding[], previous?: Baseline): string {
  const reasons = new Map(previous?.entries.map((entry) => [entry.fingerprint, entry.reason]));
  const byFingerprint = new Map<string, BaselineEntry>();
  for (const { fingerprint, ruleId, path } of findings) {
    if (byFingerprint.has(fingerprint)) continue;
    byFingerprint.set(fingerprint, {
      fingerprint,
      ruleId,
      ...(path !== undefined && { path }),
      reason: reasons.get(fingerprint) ?? "",
    });
  }
  const sorted = [...byFingerprint.values()].sort(
    (a, b) =>
      compare(a.ruleId, b.ruleId) ||
      compare(a.path ?? "", b.path ?? "") ||
      compare(a.fingerprint, b.fingerprint),
  );
  return `${JSON.stringify({ version: VERSION, findings: sorted }, null, 2)}\n`;
}
