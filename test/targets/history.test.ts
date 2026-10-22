import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  historyBlobs,
  historyFileNames,
  historyIdentities,
  InvalidRefError,
} from "../../src/targets/history.js";
import type { ScannedFile } from "../../src/targets/scanned-file.js";
import { DEFAULT_SETTINGS } from "../../src/scan/settings.js";
import { fake } from "../helpers/fake.js";
import { createRepo, type TestRepo } from "../helpers/repo.js";

async function collect(files: AsyncIterable<ScannedFile>): Promise<ScannedFile[]> {
  const all: ScannedFile[] = [];
  for await (const file of files) all.push(file);
  return all;
}

let repo: TestRepo;
beforeEach(() => {
  repo = createRepo();
});
afterEach(() => {
  repo.remove();
});

describe("historyFileNames", () => {
  it("lists every path ever committed, with the commit that first added it", async () => {
    repo.write(".env", "A=1");
    const first = repo.commit("add env");
    repo.write(".env", "A=2");
    repo.commit("change env");
    repo.git("rm", "-q", ".env");
    repo.write("app.ts", "x");
    repo.commit("remove env");

    const files = await collect(historyFileNames(repo.dir));
    expect(files).toContainEqual({ path: ".env", commit: first });
    expect(files.filter((f) => f.path === ".env")).toHaveLength(1);
    expect(files.map((f) => f.path)).toContain("app.ts");
  });

  it("includes commits on every branch", async () => {
    repo.commit("root");
    repo.git("checkout", "-q", "-b", "feature");
    repo.write("feature.key", "x");
    repo.commit("feature");
    repo.git("checkout", "-q", "main");
    const files = await collect(historyFileNames(repo.dir));
    expect(files.map((f) => f.path)).toContain("feature.key");
  });

  it("is empty for a repository without commits", async () => {
    expect(await collect(historyFileNames(repo.dir))).toEqual([]);
  });

  it("limits the History to commits not reachable from --since", async () => {
    repo.write("old.txt", "old");
    repo.commit("old");
    repo.git("tag", "v1");
    repo.write("new.txt", "new");
    repo.commit("new");
    const files = await collect(historyFileNames(repo.dir, "v1"));
    expect(files.map((f) => f.path)).toEqual(["new.txt"]);
  });

  it("rejects a --since ref that does not exist or looks like an option", async () => {
    repo.commit("root");
    await expect(collect(historyFileNames(repo.dir, "nope"))).rejects.toBeInstanceOf(
      InvalidRefError,
    );
    await expect(collect(historyFileNames(repo.dir, "--output=x"))).rejects.toBeInstanceOf(
      InvalidRefError,
    );
  });
});

describe("historyBlobs", () => {
  it("reads each distinct content once, attributed to the commit that introduced it", async () => {
    repo.write("a.txt", "same");
    const first = repo.commit("a");
    repo.write("copy.txt", "same");
    repo.write("a.txt", "changed");
    const second = repo.commit("b");
    repo.git("rm", "-q", "a.txt");
    repo.commit("deleted");

    const files = await collect(historyBlobs(repo.dir, DEFAULT_SETTINGS));
    expect(files).toContainEqual({ path: "a.txt", commit: first, size: 4, content: "same" });
    expect(files).toContainEqual({ path: "a.txt", commit: second, size: 7, content: "changed" });
    expect(files.filter((f) => f.content === "same")).toHaveLength(1);
  });

  it("skips content above the size limit", async () => {
    repo.write("big.txt", "a".repeat(50));
    const commit = repo.commit("big");
    const files = await collect(
      historyBlobs(repo.dir, { ...DEFAULT_SETTINGS, maxScanFileSize: 10 }),
    );
    expect(files).toEqual([{ path: "big.txt", commit, size: 50 }]);
  });
});

describe("historyIdentities", () => {
  it("returns each author and committer e-mail once, with its first commit", async () => {
    const personal = fake("fixture.not.real", "@", "gmail.com");
    const first = repo.commit("one", { GIT_AUTHOR_EMAIL: personal });
    repo.commit("two", { GIT_AUTHOR_EMAIL: personal });
    const identities = await historyIdentities(repo.dir);
    expect(identities).toEqual([
      { email: personal, commit: first },
      { email: "fixture@example.test", commit: first },
    ]);
  });
});
