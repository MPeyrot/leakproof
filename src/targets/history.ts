import { blobSizes, readBlobs } from "../git/blobs.js";
import { git } from "../git/git.js";
import type { ScanSettings } from "../scan/settings.js";
import { decodeText, type ScannedFile } from "./scanned-file.js";

// How the History is read: docs/adr/0007-history-scanning.md.

export class InvalidRefError extends Error {
  override name = "InvalidRefError";
}

interface HistoryEntry {
  readonly commit: string;
  readonly path: string;
  readonly oid: string;
}

const COMMIT_MARK = "\x01";
const DELETED_MODE = "000000";
const SUBMODULE_MODE = "160000";

/** Revisions to walk: every ref, minus what `since` can reach. */
async function revisions(root: string, since: string | undefined): Promise<string[]> {
  if (since === undefined) return ["--all"];
  // A ref starting with "-" would be read by git as an option.
  if (since.startsWith("-")) throw new InvalidRefError(`invalid ref for --since: ${since}`);
  try {
    await git(root, ["rev-parse", "--verify", "--quiet", `${since}^{commit}`]);
  } catch {
    throw new InvalidRefError(`unknown ref for --since: ${since}`);
  }
  return ["--all", "--not", since];
}

/** Every file version added or modified in the History, oldest commit first. */
async function historyEntries(root: string, since: string | undefined): Promise<HistoryEntry[]> {
  const output = await git(root, [
    "log",
    ...(await revisions(root, since)),
    "--reverse",
    "--no-renames",
    "--raw",
    "--no-abbrev",
    "-z",
    "--format=%x01%H",
  ]);

  // NUL-separated fields: "\x01<commit>", then pairs of ":<modes> <oids> <status>" and "<path>".
  const fields = output.split("\0").map((field) => field.replace(/^\n/, ""));
  const entries: HistoryEntry[] = [];
  let commit = "";
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i] ?? "";
    if (field.startsWith(COMMIT_MARK)) {
      commit = field.slice(1).trim();
    } else if (field.startsWith(":")) {
      const [, newMode, , oid] = field.slice(1).split(" ");
      const path = fields[++i] ?? "";
      if (oid === undefined || newMode === DELETED_MODE || newMode === SUBMODULE_MODE) continue;
      entries.push({ commit, path, oid });
    }
  }
  return entries;
}

/** Each path ever committed, once, with the commit that first added it. No content is read. */
export async function* historyFileNames(root: string, since?: string): AsyncGenerator<ScannedFile> {
  const seen = new Set<string>();
  for (const { commit, path } of await historyEntries(root, since)) {
    if (seen.has(path)) continue;
    seen.add(path);
    yield { path, commit };
  }
}

/**
 * Each distinct content in the History, once, attributed to the commit that introduced it.
 * Ignored paths are dropped first, so a content they share with another path is still read.
 */
export async function* historyBlobs(
  root: string,
  settings: ScanSettings,
  since?: string,
  isIgnored: (path: string) => boolean = () => false,
): AsyncGenerator<ScannedFile> {
  const firstSeen = new Map<string, HistoryEntry>();
  for (const entry of await historyEntries(root, since)) {
    if (!isIgnored(entry.path) && !firstSeen.has(entry.oid)) firstSeen.set(entry.oid, entry);
  }

  const sizes = await blobSizes(root, [...firstSeen.keys()]);
  const readable: string[] = [];
  for (const [oid, size] of sizes) {
    const entry = firstSeen.get(oid);
    if (entry === undefined) continue;
    if (size <= settings.maxScanFileSize) readable.push(oid);
    else yield { path: entry.path, commit: entry.commit, size };
  }

  for await (const { oid, content } of readBlobs(root, readable)) {
    const entry = firstSeen.get(oid);
    if (entry === undefined) continue;
    const text = decodeText(content);
    yield {
      path: entry.path,
      commit: entry.commit,
      size: content.length,
      ...(text !== undefined && { content: text }),
    };
  }
}

/** Each author and committer e-mail in the History, once, with the first commit using it. */
export async function historyIdentities(
  root: string,
  since?: string,
): Promise<{ email: string; commit: string }[]> {
  const output = await git(root, [
    "log",
    ...(await revisions(root, since)),
    "--reverse",
    "--format=%H%x00%ae%x00%ce",
  ]);
  const identities = new Map<string, string>();
  for (const line of output.split("\n")) {
    const [commit, author, committer] = line.split("\0");
    if (commit === undefined || commit === "") continue;
    for (const email of [author, committer]) {
      if (email !== undefined && email !== "" && !identities.has(email)) {
        identities.set(email, commit);
      }
    }
  }
  return [...identities].map(([email, commit]) => ({ email, commit }));
}
