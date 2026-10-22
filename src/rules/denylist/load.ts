import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Kept out of `.leakproofrc.json`, since the terms themselves are confidential (docs/adr/0005). */
export const DENYLIST_FILE = ".leakproof-denylist";
export const DENYLIST_VARIABLE = "LEAKPROOF_DENYLIST";

/** One term per line; `#` starts a comment line. */
export function parseDenylist(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
}

/** Terms from the repository's Denylist file, then from the comma-separated variable. */
export function loadDenylist(
  repoRoot: string,
  env: Readonly<Record<string, string | undefined>>,
): string[] {
  const path = join(repoRoot, DENYLIST_FILE);
  const fromFile = existsSync(path) ? parseDenylist(readFileSync(path, "utf8")) : [];
  const fromEnv = (env[DENYLIST_VARIABLE] ?? "")
    .split(",")
    .map((term) => term.trim())
    .filter((term) => term !== "");

  const seen = new Set<string>();
  return [...fromFile, ...fromEnv].filter((term) => {
    const key = term.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
