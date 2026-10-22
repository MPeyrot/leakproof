import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { SEVERITIES, parseSeverity, type Severity } from "../rules/rule.js";
import { RULE_IDS } from "./rule-set.js";
import { DEFAULT_SETTINGS, type ScanSettings } from "./settings.js";

export const CONFIG_FILE = ".leakproofrc.json";

export class ConfigError extends Error {
  override name = "ConfigError";
}

export interface IgnoredPath {
  readonly pattern: string;
  readonly reason: string;
}

export interface DisabledRule {
  readonly id: string;
  readonly reason: string;
}

export interface Config {
  /** Lowest Severity that makes the scan fail. */
  readonly failOn: Severity;
  readonly ignoredPaths: readonly IgnoredPath[];
  readonly disabledRules: readonly DisabledRule[];
  readonly settings: ScanSettings;
}

const KEYS = ["failOn", "ignoredPaths", "disabledRules", "maxScanFileSize", "largeFileThreshold"];

const DENYLIST_MESSAGE =
  "the Denylist cannot be set here, because this file is committed and the Denylist holds confidential terms. Put them in .leakproof-denylist (not tracked by git) or in the LEAKPROOF_DENYLIST variable (docs/adr/0005)";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(text: string, source: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ConfigError(`${source}: invalid JSON (${detail})`);
  }
}

function nonEmptyString(value: unknown, source: string, where: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ConfigError(`${source}: ${where} must be a non-empty string`);
  }
  return value;
}

function positiveInteger(value: unknown, source: string, key: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new ConfigError(`${source}: ${key} must be a positive integer`);
  }
  return value;
}

/** A list of `{ [valueKey]: string, reason: string }` entries, every one with a Reason. */
function entries(
  value: unknown,
  source: string,
  key: string,
  valueKey: string,
  check: (value: string, where: string) => void = () => undefined,
): { value: string; reason: string }[] {
  if (!Array.isArray(value)) throw new ConfigError(`${source}: ${key} must be an array`);
  return value.map((item: unknown, index) => {
    const where = `${key}[${String(index)}]`;
    if (!isObject(item)) throw new ConfigError(`${source}: ${where} must be an object`);
    for (const name of Object.keys(item)) {
      if (name !== valueKey && name !== "reason") {
        throw new ConfigError(`${source}: ${where}.${name} is not a known key`);
      }
    }
    const entryValue = nonEmptyString(item[valueKey], source, `${where}.${valueKey}`);
    check(entryValue, where);
    const reason = nonEmptyString(item["reason"], source, `${where}.reason`);
    return { value: entryValue, reason };
  });
}

/** Validates the text of a configuration file. `source` names the file in error messages. */
export function parseConfig(text: string, source: string): Config {
  const raw = parseJson(text, source);
  if (!isObject(raw)) throw new ConfigError(`${source}: the top level must be an object`);

  for (const key of Object.keys(raw)) {
    if (key === "denylist") throw new ConfigError(`${source}: ${DENYLIST_MESSAGE}`);
    if (!KEYS.includes(key)) {
      throw new ConfigError(`${source}: unknown key "${key}" (known keys: ${KEYS.join(", ")})`);
    }
  }

  let failOn: Severity = "low";
  if (raw["failOn"] !== undefined) {
    const parsed = typeof raw["failOn"] === "string" ? parseSeverity(raw["failOn"]) : undefined;
    if (parsed === undefined) {
      throw new ConfigError(`${source}: failOn must be one of ${SEVERITIES.join(", ")}`);
    }
    failOn = parsed;
  }

  const ignoredPaths =
    raw["ignoredPaths"] === undefined
      ? []
      : entries(raw["ignoredPaths"], source, "ignoredPaths", "pattern").map(
          ({ value, reason }) => ({ pattern: value, reason }),
        );

  const disabledRules =
    raw["disabledRules"] === undefined
      ? []
      : entries(raw["disabledRules"], source, "disabledRules", "id", (id, where) => {
          if (!RULE_IDS.has(id)) throw new ConfigError(`${source}: ${where}.id is unknown: ${id}`);
        }).map(({ value, reason }) => ({ id: value, reason }));

  const settings: ScanSettings = {
    maxScanFileSize:
      raw["maxScanFileSize"] === undefined
        ? DEFAULT_SETTINGS.maxScanFileSize
        : positiveInteger(raw["maxScanFileSize"], source, "maxScanFileSize"),
    largeFileThreshold:
      raw["largeFileThreshold"] === undefined
        ? DEFAULT_SETTINGS.largeFileThreshold
        : positiveInteger(raw["largeFileThreshold"], source, "largeFileThreshold"),
  };

  return { failOn, ignoredPaths, disabledRules, settings };
}

/**
 * Reads the configuration: the repository's `.leakproofrc.json` when there is one (defaults
 * otherwise), or `path` (relative to `cwd`), which must exist.
 */
export function loadConfig(options: { repoRoot: string; cwd: string; path?: string }): Config {
  const { repoRoot, cwd, path } = options;
  const file = path === undefined ? join(repoRoot, CONFIG_FILE) : resolve(cwd, path);
  const source = path ?? CONFIG_FILE;
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
    if (missing && path === undefined) return parseConfig("{}", source);
    if (missing) throw new ConfigError(`${source}: file not found`);
    throw new ConfigError(`${source}: cannot read the file (${(error as Error).message})`);
  }
  return parseConfig(text, source);
}
