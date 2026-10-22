import type { RepoInfo } from "../rules/hygiene/repo-rule.js";
import { SEVERITIES } from "../rules/rule.js";
import { historyBlobs, historyFileNames, historyIdentities } from "../targets/history.js";
import type { ScannedFile } from "../targets/scanned-file.js";
import { stagedFiles } from "../targets/staged.js";
import { worktreeFiles } from "../targets/worktree.js";
import { createFinding, type Finding } from "./finding.js";
import type { RuleSet } from "./rule-set.js";
import { scanFile } from "./scan-file.js";
import type { ScanSettings } from "./settings.js";

export interface ScanOptions {
  readonly root: string;
  readonly target: "worktree" | "staged";
  /** Also scan every blob of the History and the commit identities. */
  readonly history: boolean;
  /** Limit the History to commits not reachable from this ref. */
  readonly since?: string;
  readonly settings: ScanSettings;
  readonly rules: RuleSet;
  /** True for the repository-relative paths that are never scanned (Ignored paths). */
  readonly ignoredPaths?: (path: string) => boolean;
}

const STILL_IN_HISTORY =
  "No longer in the files, but still in the History: rewrite it (git filter-repo), and rotate anything it held.";

/**
 * Collects Findings, one per Fingerprint. The first one wins, and a later one from the History
 * only lends it the commit that introduced the content.
 */
class FindingCollector {
  readonly #byFingerprint = new Map<string, Finding>();

  add(finding: Finding): void {
    const existing = this.#byFingerprint.get(finding.fingerprint);
    if (existing === undefined) this.#byFingerprint.set(finding.fingerprint, finding);
    else if (existing.commit === undefined && finding.commit !== undefined) {
      this.#byFingerprint.set(finding.fingerprint, { ...existing, commit: finding.commit });
    }
  }

  sorted(): Finding[] {
    const rank = (finding: Finding) => SEVERITIES.indexOf(finding.severity);
    return [...this.#byFingerprint.values()].sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (a.path ?? "").localeCompare(b.path ?? "") ||
        (a.line ?? 0) - (b.line ?? 0) ||
        a.ruleId.localeCompare(b.ruleId),
    );
  }
}

export async function scan(options: ScanOptions): Promise<Finding[]> {
  const { root, settings, rules, since, ignoredPaths = () => false } = options;
  const collector = new FindingCollector();
  const scanAll = async (
    files: AsyncIterable<ScannedFile>,
    onFile?: (file: ScannedFile) => void,
  ) => {
    for await (const file of files) {
      onFile?.(file);
      if (ignoredPaths(file.path)) continue;
      for (const finding of scanFile(file, rules, settings)) collector.add(finding);
    }
  };

  if (options.target === "staged") {
    await scanAll(stagedFiles(root, settings));
    return collector.sorted();
  }

  const worktreePaths = new Set<string>();
  let gitignore: string | undefined;
  await scanAll(worktreeFiles(root, settings), (file) => {
    worktreePaths.add(file.path);
    if (file.path === ".gitignore") gitignore = file.content;
  });
  const repo: RepoInfo = { paths: worktreePaths, ...(gitignore !== undefined && { gitignore }) };
  for (const rule of rules.repoRules) {
    if (rule.check(repo)) collector.add(createFinding({ rule }));
  }

  if (options.history) {
    await scanAll(historyBlobs(root, settings, since, ignoredPaths));
    for (const { email, commit } of await historyIdentities(root, since)) {
      for (const rule of rules.identityRules) {
        if (rule.check(email)) {
          collector.add(createFinding({ rule, commit, value: email, mask: rule.mask }));
        }
      }
    }
  }

  // Cheap pass on names only: catches sensitive files deleted or ignored since (ADR 0007).
  for await (const file of historyFileNames(root, since)) {
    if (ignoredPaths(file.path)) continue;
    for (const finding of scanFile(file, { ...rules, contentRules: [] }, settings)) {
      const gone = finding.path === undefined || !worktreePaths.has(finding.path);
      collector.add(gone ? { ...finding, advice: STILL_IN_HISTORY } : finding);
    }
  }

  return collector.sorted();
}
