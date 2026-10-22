import { parseArgs } from "node:util";
import { SEVERITIES, parseSeverity, type Severity } from "../rules/rule.js";

/** Bad command line: reported with a hint to read the usage. */
export class UsageError extends Error {
  override name = "UsageError";
}

export type OutputFormat = "text" | "json";

export interface ScanOptions {
  /** Directory inside the repository to scan, relative to the working directory. */
  readonly path?: string;
  readonly staged: boolean;
  readonly history: boolean;
  readonly since?: string;
  readonly format: OutputFormat;
  /** Overrides `failOn` from the configuration. */
  readonly failOn?: Severity;
  readonly config?: string;
  readonly baseline?: string;
  readonly writeBaseline?: string;
}

export type Command =
  | { readonly kind: "help" }
  | { readonly kind: "version" }
  | { readonly kind: "scan"; readonly options: ScanOptions };

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

/** Turns the command line into a Command. Throws UsageError when it makes no sense. */
export function parseCommand(argv: readonly string[]): Command {
  let parsed;
  try {
    parsed = parseArgs({ args: [...argv], options: OPTIONS, allowPositionals: true, strict: true });
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error));
  }
  const { values, positionals } = parsed;

  if (values.help) return { kind: "help" };
  if (values.version) return { kind: "version" };

  if (positionals.length > 1) {
    throw new UsageError(`expected at most one path, got ${String(positionals.length)}`);
  }
  if (values.since !== undefined && !values.history) {
    throw new UsageError("--since only applies to --history");
  }
  if (values.staged && values.history) {
    throw new UsageError("--staged and --history cannot be combined");
  }

  const format = values.format ?? "text";
  if (format !== "text" && format !== "json") {
    throw new UsageError(`--format must be text or json (got "${format}")`);
  }

  let failOn: Severity | undefined;
  if (values["fail-on"] !== undefined) {
    failOn = parseSeverity(values["fail-on"]);
    if (failOn === undefined) {
      throw new UsageError(
        `--fail-on must be one of ${SEVERITIES.join(", ")} (got "${values["fail-on"]}")`,
      );
    }
  }

  const [path] = positionals;
  return {
    kind: "scan",
    options: {
      ...(path !== undefined && { path }),
      staged: values.staged ?? false,
      history: values.history ?? false,
      ...(values.since !== undefined && { since: values.since }),
      format,
      ...(failOn !== undefined && { failOn }),
      ...(values.config !== undefined && { config: values.config }),
      ...(values.baseline !== undefined && { baseline: values.baseline }),
      ...(values["write-baseline"] !== undefined && { writeBaseline: values["write-baseline"] }),
    },
  };
}
