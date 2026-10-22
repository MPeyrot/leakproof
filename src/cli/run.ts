import { parseArgs } from "node:util";
import { readVersion } from "../version.js";
import { ExitCode } from "./exit-codes.js";
import type { Io } from "./io.js";
import { USAGE } from "./usage.js";

const OPTIONS = {
  staged: { type: "boolean" },
  history: { type: "boolean" },
  since: { type: "string" },
  format: { type: "string" },
  "fail-on": { type: "string" },
  config: { type: "string" },
  baseline: { type: "string" },
  "write-baseline": { type: "string" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
} as const;

export function run(argv: readonly string[], io: Io): Promise<ExitCode> {
  return Promise.resolve(dispatch(argv, io));
}

function dispatch(argv: readonly string[], io: Io): ExitCode {
  let parsed;
  try {
    parsed = parseArgs({ args: [...argv], options: OPTIONS, allowPositionals: true, strict: true });
  } catch (error) {
    io.err(`leakproof: ${error instanceof Error ? error.message : String(error)}\n`);
    io.err("Run 'leakproof --help' for usage.\n");
    return ExitCode.Error;
  }

  if (parsed.values.help) {
    io.out(USAGE);
    return ExitCode.Clean;
  }
  if (parsed.values.version) {
    io.out(`${readVersion()}\n`);
    return ExitCode.Clean;
  }

  io.err("leakproof: scanning is not implemented yet\n");
  return ExitCode.Error;
}
