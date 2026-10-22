# How the History is scanned

The most common trap is a sensitive file that was deleted or added to `.gitignore` but is still in the History. So the default scan also runs a cheap pass over the file names of the whole History (`git log --all --name-only`), and does not read their contents. `--history` adds a full content scan and the author and committer e-mails. To avoid reading the same content many times, it lists `(commit, path, blob)` with `git log --all --raw --no-abbrev`, scans each unique blob only once through a single `git cat-file --batch` stream, and attributes each Finding to the oldest commit that introduced the blob.

`--since <ref>` takes a git ref, not a date as git's own `--since` does: it limits the scan to commits not reachable from that ref (`--all --not <ref>`). `--help` states this explicitly.
