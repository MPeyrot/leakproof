import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { findRepoRoot } from "../git/git.js";
import { formatJson } from "../report/json.js";
import { printable } from "../report/printable.js";
import type { Report } from "../report/report.js";
import { formatText } from "../report/text.js";
import { loadDenylist } from "../rules/denylist/load.js";
import { applyBaseline, loadBaseline, serializeBaseline, type Baseline } from "../scan/baseline.js";
import { loadConfig, type Config } from "../scan/config.js";
import { failsOn } from "../scan/fail-on.js";
import type { Finding } from "../scan/finding.js";
import { compileIgnoredPaths } from "../scan/ignored-paths.js";
import { buildRuleSet } from "../scan/rule-set.js";
import { scan } from "../scan/scan.js";
import { readVersion } from "../version.js";
import { ExitCode } from "./exit-codes.js";
import type { Io } from "./io.js";
import { UsageError, parseCommand, type ScanOptions } from "./options.js";
import { USAGE } from "./usage.js";

/** Runs the CLI and returns its exit code. It never throws: every failure is code 2. */
export async function run(argv: readonly string[], io: Io): Promise<ExitCode> {
  try {
    const command = parseCommand(argv);
    if (command.kind === "help") {
      io.out(USAGE);
      return ExitCode.Clean;
    }
    if (command.kind === "version") {
      io.out(`${readVersion()}\n`);
      return ExitCode.Clean;
    }
    return await execute(command.options, io);
  } catch (error) {
    reportFailure(error, io);
    return ExitCode.Error;
  }
}

function reportFailure(error: unknown, io: Io): void {
  // Only the message unless asked: a stack trace could echo scanned content.
  io.err(`leakproof: ${error instanceof Error ? error.message : "unexpected error"}\n`);
  if (error instanceof UsageError) io.err("Run 'leakproof --help' for usage.\n");
  else if (io.env["LEAKPROOF_DEBUG"] && error instanceof Error && error.stack !== undefined) {
    io.err(`${error.stack}\n`);
  }
}

interface Context {
  readonly repoRoot: string;
  readonly config: Config;
  readonly baseline: Baseline;
  readonly denylist: readonly string[];
}

async function loadContext(options: ScanOptions, io: Io): Promise<Context> {
  const repoRoot = await findRepoRoot(resolve(io.cwd, options.path ?? "."));
  const { cwd } = io;
  return {
    repoRoot,
    config: loadConfig({
      repoRoot,
      cwd,
      ...(options.config !== undefined && { path: options.config }),
    }),
    // Rewriting the Baseline must work even while some Reasons are still empty.
    baseline: loadBaseline({
      repoRoot,
      cwd,
      ...(options.baseline !== undefined && { path: options.baseline }),
      requireReasons: options.writeBaseline === undefined,
    }),
    denylist: loadDenylist(repoRoot, io.env),
  };
}

function runScan(options: ScanOptions, context: Context): Promise<Finding[]> {
  const { repoRoot, config, denylist } = context;
  return scan({
    root: repoRoot,
    target: options.staged ? "staged" : "worktree",
    history: options.history,
    ...(options.since !== undefined && { since: options.since }),
    settings: config.settings,
    rules: buildRuleSet({ denylist, disabledRules: config.disabledRules.map(({ id }) => id) }),
    ignoredPaths: compileIgnoredPaths(config.ignoredPaths.map(({ pattern }) => pattern)),
  });
}

async function execute(options: ScanOptions, io: Io): Promise<ExitCode> {
  const context = await loadContext(options, io);
  const findings = await runScan(options, context);

  if (options.writeBaseline !== undefined) {
    writeBaseline(options.writeBaseline, findings, context.baseline, io);
    return ExitCode.Clean;
  }

  const failOn = options.failOn ?? context.config.failOn;
  const { findings: remaining, accepted, stale } = applyBaseline(findings, context.baseline);
  for (const { fingerprint, ruleId, path } of stale) {
    const where = printable(path === undefined ? ruleId : `${ruleId} ${path}`);
    io.err(`warning: Baseline entry ${fingerprint} (${where}) matches no Finding any more\n`);
  }

  const report: Report = { findings: remaining, accepted, stale, failOn };
  io.out(
    options.format === "json"
      ? formatJson(report)
      : formatText(report, { color: io.isTTY && !io.env["NO_COLOR"] }),
  );
  return failsOn(remaining, failOn) ? ExitCode.Findings : ExitCode.Clean;
}

function writeBaseline(file: string, findings: readonly Finding[], previous: Baseline, io: Io) {
  writeFileSync(resolve(io.cwd, file), serializeBaseline(findings, previous));
  const count = new Set(findings.map(({ fingerprint }) => fingerprint)).size;
  io.err(
    `Wrote ${String(count)} ${count === 1 ? "entry" : "entries"} to ${file}. ` +
      "Write a reason for each one before the next scan.\n",
  );
}
