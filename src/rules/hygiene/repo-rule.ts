import type { RuleMeta } from "../rule.js";

/** What a repository-wide Rule can know about the Worktree. */
export interface RepoInfo {
  /** Every path in the Worktree, as git prints them. */
  readonly paths: ReadonlySet<string>;
  /** Files on disk that git ignores. An ignored directory appears once, ending with `/`. */
  readonly gitIgnored: ReadonlySet<string>;
}

/** A Rule about the repository as a whole: a file every public repository should have. */
export interface RepoRule extends RuleMeta {
  readonly category: "hygiene";
  /** True when the repository breaks the Rule. */
  check(repo: RepoInfo): boolean;
}
