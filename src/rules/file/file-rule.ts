import type { RuleMeta } from "../rule.js";

/** What a file Rule can know about a file. Paths always use `/`, as git prints them. */
export interface FileInfo {
  readonly path: string;
  readonly size?: number;
  /** Text content, absent for binary files and for the History file-name pass. */
  readonly content?: string;
  /** True when git stores the file through Git LFS. */
  readonly isLfs?: boolean;
}

export interface FileRuleSettings {
  readonly largeFileThreshold: number;
}

/** A Rule about a file as a whole: its name, location, size or kind of content. */
export interface FileRule extends RuleMeta {
  readonly category: "sensitive-file";
  /**
   * Returns the path to report, which may be a parent directory so that a committed
   * directory yields one Finding rather than one per file, or undefined when it does not match.
   */
  check(file: FileInfo, settings: FileRuleSettings): string | undefined;
}

export function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

/** True when the path ends with `suffix` as whole path segments (`.aws/credentials`). */
export function endsWithSegments(path: string, suffix: string): boolean {
  return path === suffix || path.endsWith(`/${suffix}`);
}
