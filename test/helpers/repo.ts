import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/** Keeps the developer's own git configuration (hooks, signing, templates) out of the tests. */
export const ISOLATED_GIT_ENV = {
  ...process.env,
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_AUTHOR_NAME: "Fixture Author",
  GIT_AUTHOR_EMAIL: "fixture@example.test",
  GIT_COMMITTER_NAME: "Fixture Author",
  GIT_COMMITTER_EMAIL: "fixture@example.test",
};

export interface TestRepo {
  readonly dir: string;
  write(path: string, content: string | Buffer): void;
  git(...args: string[]): string;
  commit(message: string, env?: Record<string, string>): string;
  remove(): void;
}

/** A throwaway git repository in the system temp directory. */
export function createRepo(): TestRepo {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "leakproof-repo-")));
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: dir, env: ISOLATED_GIT_ENV, encoding: "utf8" });
  git("init", "-q", "-b", "main");

  return {
    dir,
    git,
    write(path, content) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), content);
    },
    commit(message, env = {}) {
      git("add", "-A");
      execFileSync("git", ["commit", "-q", "--allow-empty", "-m", message], {
        cwd: dir,
        env: { ...ISOLATED_GIT_ENV, ...env },
      });
      return git("rev-parse", "HEAD").trim();
    },
    remove() {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
