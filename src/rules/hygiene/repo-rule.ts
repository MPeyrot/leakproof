import type { RuleMeta } from "../rule.js";

/** What a repository-wide Rule can know about the Worktree. */
export interface RepoInfo {
  /** Every path in the Worktree, as git prints them. */
  readonly paths: ReadonlySet<string>;
  /** Content of the root `.gitignore`, when there is one. */
  readonly gitignore?: string;
}

/** A Rule about the repository as a whole: a file every public repository should have. */
export interface RepoRule extends RuleMeta {
  readonly category: "hygiene";
  /** True when the repository breaks the Rule. */
  check(repo: RepoInfo): boolean;
}
