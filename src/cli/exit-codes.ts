export const ExitCode = {
  /** No Finding at or above the --fail-on Severity. */
  Clean: 0,
  /** At least one Finding at or above the --fail-on Severity. */
  Findings: 1,
  /** Bad usage, not a git repository, invalid configuration or Baseline, unexpected error. */
  Error: 2,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];
