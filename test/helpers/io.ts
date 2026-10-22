import type { Io } from "../../src/cli/io.js";

export interface CapturedIo extends Io {
  stdout(): string;
  stderr(): string;
}

export function captureIo(): CapturedIo {
  let out = "";
  let err = "";
  return {
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
