import type { Io } from "../../src/cli/io.js";

export interface CapturedIo extends Io {
  stdout(): string;
  stderr(): string;
}

/** An Io that records its output. Defaults to a plain pipe in the current directory. */
export function captureIo(options: Partial<Pick<Io, "cwd" | "env" | "isTTY">> = {}): CapturedIo {
  let out = "";
  let err = "";
  return {
    cwd: process.cwd(),
    env: {},
    isTTY: false,
    ...options,
    out: (text) => {
      out += text;
    },
    err: (text) => {
      err += text;
    },
    stdout: () => out,
    stderr: () => err,
  };
}
