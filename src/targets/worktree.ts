import { lstatSync, readFileSync, readlinkSync, type Stats } from "node:fs";
import { join } from "node:path";
import { git, gitWithInput, splitNul } from "../git/git.js";
import type { ScanSettings } from "../scan/settings.js";
import { decodeText, type ScannedFile } from "./scanned-file.js";

function statOrUndefined(path: string): Stats | undefined {
  try {
    return lstatSync(path);
  } catch {
    return undefined;
  }
}

/** Paths among `paths` that git stores through Git LFS. */
async function lfsPaths(root: string, paths: readonly string[]): Promise<Set<string>> {
  if (paths.length === 0) return new Set();
  const output = await gitWithInput(
    root,
    ["check-attr", "-z", "--stdin", "filter"],
    paths.join("\0"),
  );
  const fields = output.toString("utf8").split("\0");
  const lfs = new Set<string>();
  for (let i = 0; i + 2 < fields.length; i += 3) {
    if (fields[i + 2] === "lfs") lfs.add(fields[i] ?? "");
  }
  return lfs;
}

/** Files on disk that git ignores; an ignored directory is listed once, ending with `/`. */
export async function gitIgnoredFiles(root: string): Promise<string[]> {
  const listed = await git(root, [
    "ls-files",
    "-z",
    "--others",
    "--ignored",
    "--exclude-standard",
    "--directory",
  ]);
  return splitNul(listed);
}

/**
 * The Worktree: tracked and untracked files, minus those excluded by .gitignore.
 * Symbolic links are never followed; their target is scanned as text, as git stores it.
 */
export async function* worktreeFiles(
  root: string,
  settings: ScanSettings,
): AsyncGenerator<ScannedFile> {
  const listed = await git(root, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]);
  const entries = [...new Set(splitNul(listed))]
    .map((path) => ({ path, stats: statOrUndefined(join(root, path)) }))
    .filter(({ stats }) => stats !== undefined && (stats.isFile() || stats.isSymbolicLink()));

  const large = entries
    .filter(({ stats }) => stats !== undefined && stats.size > settings.largeFileThreshold)
    .map(({ path }) => path);
  const lfs = await lfsPaths(root, large);

  for (const { path, stats } of entries) {
    const absolute = join(root, path);
    if (stats?.isSymbolicLink()) {
      const target = readlinkSync(absolute);
      yield { path, size: Buffer.byteLength(target), content: target };
      continue;
    }
    const size = stats?.size ?? 0;
    const content =
      size <= settings.maxScanFileSize ? decodeText(readFileSync(absolute)) : undefined;
    yield {
      path,
      size,
      ...(content !== undefined && { content }),
      ...(lfs.has(path) && { isLfs: true }),
    };
  }
}
