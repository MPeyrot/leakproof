import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";

// Every call goes through execFile/spawn with an argument array, never a shell (docs/adr/0002).

export class GitError extends Error {
  override name = "GitError";
}

export class NotAGitRepositoryError extends Error {
  override name = "NotAGitRepositoryError";
}

const MAX_OUTPUT = 1024 ** 3;

function failure(args: readonly string[], stderr: string, fallback: string): GitError {
  const reason = stderr.split("\n").find((line) => line.trim() !== "") ?? fallback;
  return new GitError(`git ${args[0] ?? ""} failed: ${reason}`);
}

/** Runs git and returns its standard output as text. */
export function git(cwd: string, args: readonly string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      args,
      { cwd, maxBuffer: MAX_OUTPUT, encoding: "utf8" },
      (error, stdout, stderr) => {
        if (error === null) resolve(stdout);
        else reject(failure(args, stderr, error.message));
      },
    );
  });
}

/** Runs git with `input` on its standard input and returns its raw standard output. */
export function gitWithInput(cwd: string, args: readonly string[], input: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd });
    const out: Buffer[] = [];
    let err = "";
    child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => (err += chunk.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(out));
      else reject(failure(args, err, `exit code ${String(code)}`));
    });
    child.stdin.end(input);
  });
}

/** The top-level directory of the repository containing `path`. */
export async function findRepoRoot(path: string): Promise<string> {
  if (!existsSync(path)) throw new NotAGitRepositoryError(`no such directory: ${path}`);
  try {
    return (await git(path, ["rev-parse", "--show-toplevel"])).trim();
  } catch {
    throw new NotAGitRepositoryError(`not a git repository: ${path}`);
  }
}

/** Splits NUL-separated git output, dropping the trailing empty field. */
export function splitNul(output: string): string[] {
  return output.split("\0").filter((field) => field !== "");
}
