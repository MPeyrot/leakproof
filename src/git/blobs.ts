import { spawn } from "node:child_process";
import { GitError, gitWithInput } from "./git.js";

/** Size in bytes of each blob, read with one `git cat-file --batch-check`. */
export async function blobSizes(
  cwd: string,
  oids: readonly string[],
): Promise<Map<string, number>> {
  const sizes = new Map<string, number>();
  if (oids.length === 0) return sizes;
  const output = await gitWithInput(cwd, ["cat-file", "--batch-check"], `${oids.join("\n")}\n`);
  for (const line of output.toString("utf8").split("\n")) {
    const [oid, type, size] = line.split(" ");
    if (oid !== undefined && type === "blob" && size !== undefined) sizes.set(oid, Number(size));
  }
  return sizes;
}

/** Streams the content of each blob through a single `git cat-file --batch` process. */
export async function* readBlobs(
  cwd: string,
  oids: readonly string[],
): AsyncGenerator<{ oid: string; content: Buffer }> {
  if (oids.length === 0) return;
  const child = spawn("git", ["cat-file", "--batch"], { cwd });
  const exited = new Promise<number | null>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
  child.stdin.end(`${oids.join("\n")}\n`);

  // Output: "<oid> <type> <size>\n<content>\n" per object, or "<oid> missing\n".
  let pending = Buffer.alloc(0);
  for await (const chunk of child.stdout as AsyncIterable<Buffer>) {
    pending = Buffer.concat([pending, chunk]);
    for (;;) {
      const newline = pending.indexOf(10);
      if (newline === -1) break;
      const [oid = "", type, sizeText] = pending.subarray(0, newline).toString("utf8").split(" ");
      if (type === "missing" || sizeText === undefined) {
        pending = pending.subarray(newline + 1);
        continue;
      }
      const end = newline + 1 + Number(sizeText);
      if (pending.length < end + 1) break;
      yield { oid, content: pending.subarray(newline + 1, end) };
      pending = pending.subarray(end + 1);
    }
  }

  const code = await exited;
  if (code !== 0) throw new GitError(`git cat-file failed with exit code ${String(code)}`);
}
