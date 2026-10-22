import { rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findRepoRoot, NotAGitRepositoryError } from "../../src/git/git.js";
import type { ScannedFile } from "../../src/targets/scanned-file.js";
import { stagedFiles } from "../../src/targets/staged.js";
import { worktreeFiles } from "../../src/targets/worktree.js";
import { DEFAULT_SETTINGS } from "../../src/scan/settings.js";
import { createRepo, type TestRepo } from "../helpers/repo.js";

async function collect(files: AsyncIterable<ScannedFile>): Promise<Map<string, ScannedFile>> {
  const byPath = new Map<string, ScannedFile>();
  for await (const file of files) byPath.set(file.path, file);
  return byPath;
}

let repo: TestRepo;
beforeEach(() => {
  repo = createRepo();
});
afterEach(() => {
  repo.remove();
});

describe("findRepoRoot", () => {
  it("returns the top-level directory from a subdirectory", async () => {
    repo.write("src/a.ts", "");
    expect(await findRepoRoot(join(repo.dir, "src"))).toBe(repo.dir);
  });

  it("rejects a directory outside any repository", async () => {
    await expect(findRepoRoot("/")).rejects.toBeInstanceOf(NotAGitRepositoryError);
  });
});

describe("worktreeFiles", () => {
  it("lists tracked and untracked files, but not ignored ones", async () => {
    repo.write(".gitignore", "secret.txt\n");
    repo.write("tracked.ts", "tracked");
    repo.commit("init");
    repo.write("untracked.ts", "untracked");
    repo.write("secret.txt", "ignored");

    const files = await collect(worktreeFiles(repo.dir, DEFAULT_SETTINGS));
    expect([...files.keys()].sort()).toEqual([".gitignore", "tracked.ts", "untracked.ts"]);
    expect(files.get("untracked.ts")).toMatchObject({ content: "untracked", size: 9 });
  });

  it("skips files deleted from disk but still in the index", async () => {
    repo.write("gone.ts", "x");
    repo.commit("init");
    rmSync(join(repo.dir, "gone.ts"));
    const files = await collect(worktreeFiles(repo.dir, DEFAULT_SETTINGS));
    expect(files.has("gone.ts")).toBe(false);
  });

  it("does not read binary files or files above the size limit", async () => {
    repo.write("image.bin", Buffer.from([0x89, 0x50, 0x00, 0x01]));
    repo.write("big.txt", "a".repeat(2000));
    const files = await collect(
      worktreeFiles(repo.dir, { ...DEFAULT_SETTINGS, maxScanFileSize: 1000 }),
    );
    expect(files.get("image.bin")).toEqual({ path: "image.bin", size: 4 });
    expect(files.get("big.txt")).toEqual({ path: "big.txt", size: 2000 });
  });

  it("never follows symbolic links, and scans their target as text", async () => {
    repo.write("outside/target.txt", "must not be read");
    symlinkSync(join(repo.dir, "outside", "target.txt"), join(repo.dir, "link.txt"));
    const files = await collect(worktreeFiles(repo.dir, DEFAULT_SETTINGS));
    expect(files.get("link.txt")?.content).toBe(join(repo.dir, "outside", "target.txt"));
  });
});

describe("stagedFiles", () => {
  it("returns the staged content, not the worktree content", async () => {
    repo.write("a.ts", "committed");
    repo.commit("init");
    repo.write("a.ts", "staged");
    repo.git("add", "a.ts");
    repo.write("a.ts", "worktree only");
    repo.write("b.ts", "not staged");

    const files = await collect(stagedFiles(repo.dir, DEFAULT_SETTINGS));
    expect([...files.keys()]).toEqual(["a.ts"]);
    expect(files.get("a.ts")).toMatchObject({ content: "staged", size: 6 });
  });

  it("ignores staged deletions", async () => {
    repo.write("a.ts", "x");
    repo.commit("init");
    repo.git("rm", "-q", "a.ts");
    const files = await collect(stagedFiles(repo.dir, DEFAULT_SETTINGS));
    expect(files.size).toBe(0);
  });

  it("works before the first commit", async () => {
    repo.write("a.ts", "first");
    repo.git("add", "a.ts");
    const files = await collect(stagedFiles(repo.dir, DEFAULT_SETTINGS));
    expect(files.get("a.ts")?.content).toBe("first");
  });
});
