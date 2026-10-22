export const USAGE = `Usage: leakproof [path] [options]

Check your repo before it goes public. Secrets, personal data, git history.

Scans the git repository at [path] (default: current directory).

Scan target:
  (default)               Worktree contents, plus file names across the whole History
  --staged                Only the content staged in the git index (pre-commit use)
  --history               Also scan every blob in the History and commit author e-mails
  --since <ref>           With --history, only commits not reachable from <ref>
                          (a git ref such as a tag or branch, not a date)

Output:
  --format <text|json>    Report format (default: text)
  --fail-on <severity>    Exit 1 only for Findings at or above this Severity:
                          critical, high, medium, low (default: low)

Configuration:
  --config <file>         Configuration file (default: .leakproofrc.json)
  --baseline <file>       Baseline of accepted Findings (default: .leakproof-baseline.json)
  --write-baseline <file> Write every current Finding to a Baseline, with empty Reasons to fill in

  -h, --help              Show this help
  -v, --version           Show the version

Exit codes: 0 no Finding, 1 Findings found, 2 error.
`;
