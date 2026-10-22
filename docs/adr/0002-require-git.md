# Require a git repository and delegate file listing to git

leakproof needs to respect `.gitignore` and to read the index and the history. Reimplementing gitignore semantics is fragile or costs a dependency, so every file listing goes through the `git` binary (`git ls-files --cached --others --exclude-standard` for the Worktree, the index for Staged, `git log`/`git cat-file` for History), always via `execFile` and never through a shell. The trade-off: leakproof refuses to run outside a git repository and exits with code 2 and a clear message.
