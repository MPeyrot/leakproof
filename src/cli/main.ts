#!/usr/bin/env node
import { ExitCode } from "./exit-codes.js";
import { processIo } from "./io.js";
import { run } from "./run.js";

run(process.argv.slice(2), processIo).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    // Only the message: a stack trace or error payload could echo scanned content.
    processIo.err(`leakproof: ${error instanceof Error ? error.message : "unexpected error"}\n`);
    process.exitCode = ExitCode.Error;
  },
);
