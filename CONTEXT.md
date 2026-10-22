# leakproof

A command-line check that tells whether a git repository is safe to make public: it looks for anything that must not end up online (secrets, personal data, confidential names) in the files and in the git history.

## Language

### Scanning

**Scan target**:
The set of content a scan looks at: the **Worktree**, the **Staged** changes, or the **History**.
_Avoid_: mode, scope, source

**Worktree**:
The files currently in the repository, minus those excluded by `.gitignore`.
_Avoid_: working directory, checkout

**Staged**:
The content currently in the git index, as it would be committed.
_Avoid_: cached, pending changes

**History**:
Every commit reachable in the repository, including files deleted since.
_Avoid_: log, past commits

### Detection

**Rule**:
A named detection definition with a stable id, a category and a **Severity**.
_Avoid_: check, detector, pattern

**Category**:
The family a **Rule** belongs to: sensitive file, secret, personal data, denylist, git identity, or repo hygiene.
_Avoid_: type, kind

**Finding**:
One occurrence of a **Rule** matching at a location (file, line, commit).
_Avoid_: alert, issue, leak, match, hit

**Severity**:
How serious a **Finding** is: critical, high, medium or low.
_Avoid_: level, priority

**Masked value**:
The only form in which a matched value is ever shown: a public prefix at most, a fixed run of stars, and a short suffix only for long values.
_Avoid_: redacted, obfuscated, preview

**Placeholder value**:
A value that looks like a secret's slot but is obviously not one (`changeme`, `your-api-key`, `${VAR}`); it never produces a **Finding**.
_Avoid_: dummy, fake, sample

**Denylist**:
User-supplied terms (client names, confidential project names, internal domains) whose every occurrence is a **Finding**; the terms themselves are confidential and never shown.
_Avoid_: blocklist, banned words, blacklist

**Personal email**:
An address at a consumer mailbox provider (Gmail, Outlook, iCloud, Free, Orange…), excluding noreply and example addresses; a company address is not one.
_Avoid_: private email, user email

### Exceptions

**Baseline**:
A list of specific **Findings** accepted on purpose, each with a **Reason**.
_Avoid_: allowlist, ignore file, exceptions file

**Fingerprint**:
A stable identifier of a **Finding** that lets the **Baseline** recognise it without containing the matched value.
_Avoid_: hash, id

**Reason**:
The mandatory written justification attached to every **Baseline** entry, ignored path and disabled **Rule**.
_Avoid_: comment, note

**Ignored path**:
A path pattern declared in the configuration whose files are never scanned.
_Avoid_: exclusion, skip
