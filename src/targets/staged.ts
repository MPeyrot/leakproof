import { blobSizes, readBlobs } from "../git/blobs.js";
import { git, splitNul } from "../git/git.js";
import type { ScanSettings } from "../scan/settings.js";
import { decodeText, type ScannedFile } from "./scanned-file.js";

const SUBMODULE_MODE = "160000";

/** Staged: the content of added, copied, modified or renamed files, as it sits in the index. */
export async function* stagedFiles(
  root: string,
  settings: ScanSettings,
): AsyncGenerator<ScannedFile> {
  const changed = new Set(
    splitNul(await git(root, ["diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR"])),
  );
  if (changed.size === 0) return;

  // "<mode> <oid> <stage>\t<path>" for every index entry.
  const pathsByOid = new Map<string, string[]>();
  for (const entry of splitNul(await git(root, ["ls-files", "-s", "-z"]))) {
    const tab = entry.indexOf("\t");
    const [mode, oid] = entry.slice(0, tab).split(" ");
    const path = entry.slice(tab + 1);
    if (!changed.has(path) || mode === SUBMODULE_MODE || oid === undefined) continue;
    pathsByOid.set(oid, [...(pathsByOid.get(oid) ?? []), path]);
  }

  const sizes = await blobSizes(root, [...pathsByOid.keys()]);
  const readable = [...sizes]
    .filter(([, size]) => size <= settings.maxScanFileSize)
    .map(([oid]) => oid);

  for (const [oid, size] of sizes) {
    if (size > settings.maxScanFileSize) {
      for (const path of pathsByOid.get(oid) ?? []) yield { path, size };
    }
  }
  for await (const { oid, content } of readBlobs(root, readable)) {
    const text = decodeText(content);
    for (const path of pathsByOid.get(oid) ?? []) {
      yield { path, size: content.length, ...(text !== undefined && { content: text }) };
    }
  }
}
