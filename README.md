# leakproof

Check your repo before it goes public. Secrets, personal data, git history.

leakproof scans a git repository for things that should not end up online: API keys, private key files, `.env` files, IBANs, personal e-mail addresses, confidential names of your own. It looks at the files you have now and, if you ask, at every commit ever made. A secret deleted two years ago is still public once the repository is.

It needs Node.js 22 or later and `git` on the PATH.

```sh
npx leakproof                # one-off run in the current repository
npm i -D leakproof           # or add it to a project
```

## Usage

Run it from inside a git repository, or pass the path of one:

```sh
leakproof [path] [options]
```

Here is a run on a throwaway repository where a fake token (built from pieces, marked `TESTONLY`) was committed in `src/deploy.js`:

```text
$ npx leakproof
CRITICAL  secret/github-token
          src/deploy.js:1  ghp_********opqr
          GitHub token
          Revoke it in GitHub settings (Developer settings → Personal access tokens).

HIGH      secret/keyword-assignment
          src/deploy.js:1  ********opqr
          Hard-coded secret assigned to a sensitive name
          Move the value to an environment variable or a secret manager, and rotate it.

2 Findings: 1 critical, 1 high.
$ echo $?
1
```

Each Finding shows the Rule id, the location, the Masked value and what to do about it. The matched value itself is never printed (see [Privacy](#privacy)).

### Scan targets

| Command                             | What is scanned                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| `leakproof`                         | The Worktree, plus the file names across the whole History                            |
| `leakproof --staged`                | Only what is in the git index, as it would be committed                               |
| `leakproof --history`               | The Worktree, plus the content of every blob in the History and commit author e-mails |
| `leakproof --history --since <ref>` | Same, limited to commits not reachable from `<ref>` (a tag or branch, not a date)     |

The Worktree is every file git would track, so files excluded by `.gitignore` are skipped. The file-name pass in the default scan catches the most common mistake cheaply: a sensitive file that was deleted or added to `.gitignore` but still sits in an old commit. It does not read the content of those files.

`--history` is more thorough and costs more time. It lists every `(commit, path, blob)` once, reads each unique blob a single time and attributes each Finding to the oldest commit that introduced it, so a large repository stays tractable. Run it before going public and in CI. Use `--staged` in a pre-commit hook, where speed matters. See [ADR 0007](docs/adr/0007-history-scanning.md).

## What it detects

Every match is a Finding with a Rule id and a Severity. The default is precision over recall ([ADR 0004](docs/adr/0004-precision-over-recall.md)): only Rules with a low false-positive rate ship, and Placeholder values such as `changeme`, `your-api-key` or `${VAR}` never produce a Finding.

### Sensitive files

| Rule id                                 | Severity | Description                                                                                           |
| --------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `sensitive-file/private-key`            | critical | SSH keys, `.key`, `.p12`, `.pfx`, `.jks`, `.keystore`, `.ppk`, and `.pem` files holding a private key |
| `sensitive-file/env-file`               | critical | `.env`, `.env.*` and `.envrc` files (templates such as `.env.example` are fine)                       |
| `sensitive-file/terraform-state`        | critical | Terraform state                                                                                       |
| `sensitive-file/git-credentials`        | critical | Git credential store                                                                                  |
| `sensitive-file/credentials-file`       | high     | `credentials.json`, service-account and client-secret JSON, `.aws/credentials`, kubeconfig            |
| `sensitive-file/database-dump`          | high     | `.sqlite`, `.db`, `.dump` files and `.sql` files with a dump-tool header                              |
| `sensitive-file/docker-config`          | high     | Docker config with registry credentials                                                               |
| `sensitive-file/registry-token`         | high     | `.npmrc`, `.pypirc`, `.netrc` containing a written-out credential                                     |
| `sensitive-file/backup`                 | medium   | `.bak` and `.backup` files, archives named like backups                                               |
| `sensitive-file/committed-dependencies` | low      | `node_modules/` or `dist/` committed                                                                  |
| `sensitive-file/large-file`             | low      | Files above 5 MiB that are not in Git LFS                                                             |
| `sensitive-file/os-metadata`            | low      | `.DS_Store`, `Thumbs.db`, `desktop.ini`                                                               |

### Secrets

| Rule id                        | Severity | Description                                                                                              |
| ------------------------------ | -------- | -------------------------------------------------------------------------------------------------------- |
| `secret/aws-access-key-id`     | critical | AWS access key ID                                                                                        |
| `secret/aws-secret-access-key` | critical | AWS secret access key                                                                                    |
| `secret/github-token`          | critical | GitHub token                                                                                             |
| `secret/gitlab-token`          | critical | GitLab personal access token                                                                             |
| `secret/npm-token`             | critical | npm access token                                                                                         |
| `secret/slack-token`           | critical | Slack token or webhook URL                                                                               |
| `secret/sendgrid-key`          | critical | SendGrid API key                                                                                         |
| `secret/stripe-live-key`       | critical | Stripe live secret key (`sk_test_` keys are ignored on purpose)                                          |
| `secret/openai-key`            | critical | OpenAI API key                                                                                           |
| `secret/anthropic-key`         | critical | Anthropic API key                                                                                        |
| `secret/private-key-block`     | critical | A PEM private key block inside any file                                                                  |
| `secret/credentials-in-url`    | critical | Password in a URL                                                                                        |
| `secret/google-api-key`        | high     | Google API key (Firebase web keys are public by design but should be restricted)                         |
| `secret/jwt`                   | high     | JSON Web Token (a Supabase anon key is public by design; a service-role key is not)                      |
| `secret/keyword-assignment`    | high     | A random-looking value assigned to a name ending in `password`, `secret`, `token`, `api_key` and similar |

### Personal data

| Rule id                        | Severity | Description                                                                                                                       |
| ------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `personal-data/iban`           | high     | Bank account number (IBAN), checksum verified                                                                                     |
| `personal-data/card-number`    | high     | Payment card number, Luhn checksum verified                                                                                       |
| `personal-data/nir`            | high     | French social security number (NIR), key verified                                                                                 |
| `personal-data/personal-email` | medium   | Address at a consumer mailbox provider (Gmail, Outlook, iCloud, Free, Orange...); company, noreply and example addresses are fine |
| `personal-data/user-path`      | medium   | Absolute path revealing a user name, such as a home directory; generic accounts (`runner`, `ubuntu`, `root`...) are fine          |

### Denylist

| Rule id                 | Severity | Description                                                      |
| ----------------------- | -------- | ---------------------------------------------------------------- |
| `denylist/term`         | high     | An occurrence of one of your own terms, reported by entry number |
| `denylist/tracked-file` | critical | The Denylist file itself is committed                            |

### Git identity

| Rule id                       | Severity | Description                                                                |
| ----------------------------- | -------- | -------------------------------------------------------------------------- |
| `git-identity/personal-email` | medium   | Personal e-mail address in a commit author or committer (`--history` only) |

### Repository hygiene

These Rules look at the repository as a whole and only run on the Worktree. They produce Findings with no path or line.

| Rule id                       | Severity | Description                                                                         |
| ----------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `hygiene/missing-gitignore`   | medium   | No `.gitignore` at the root                                                         |
| `hygiene/missing-readme`      | low      | No README at the root, in `.github/` or in `docs/`                                  |
| `hygiene/missing-license`     | low      | No LICENSE file at the root                                                         |
| `hygiene/missing-env-example` | low      | A real `.env` file sits on disk (ignored by git) and no `.env.example` documents it |

## Configuration

leakproof reads `.leakproofrc.json` at the repository root, if it exists. Use `--config <file>` for another path. Unknown keys are an error, and so is a missing Reason.

```json
{
  "failOn": "medium",
  "ignoredPaths": [{ "pattern": "test/fixtures/**", "reason": "Fake data used by the tests" }],
  "disabledRules": [
    { "id": "hygiene/missing-readme", "reason": "Documentation lives on the project website" }
  ],
  "maxScanFileSize": 1048576,
  "largeFileThreshold": 5242880
}
```

| Key                  | Meaning                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| `failOn`             | Lowest Severity that makes the run fail: `critical`, `high`, `medium` or `low` (default `low`)        |
| `ignoredPaths`       | Files that are never scanned. Each entry has a `pattern` and a mandatory `reason`                     |
| `disabledRules`      | Rules turned off, by id. Each entry has an `id` and a mandatory `reason`                              |
| `maxScanFileSize`    | Files larger than this many bytes are not read, so only file-name Rules apply to them (default 1 MiB) |
| `largeFileThreshold` | Size in bytes above which `sensitive-file/large-file` fires (default 5 MiB)                           |

Every exception needs a Reason. There is no inline `leakproof-ignore` comment: exceptions live in the configuration or the Baseline, where they can be reviewed in one place.

### Ignored path patterns

Patterns are a small glob dialect, not gitignore syntax:

- They are matched against the repository-relative path and anchored at the root. `*.log` matches `a.log` but not `src/a.log`; write `**/*.log` for that.
- `*` matches any characters except `/`, `?` matches one character except `/`, and `**` as a whole path segment matches any number of directories (`docs/**`, `**/fixtures/**`).
- A pattern that matches a directory ignores everything under it, so `vendor` and `vendor/` both ignore `vendor/a/b.js`.
- There is no `!` negation, no `[a-z]` classes and no `{a,b}` braces. Those characters are literal.

### Denylist

The Denylist holds terms that must never appear in the repository: client names, confidential project names, internal domains. Put them in `.leakproof-denylist` at the repository root, one per line (`#` starts a comment), or in the `LEAKPROOF_DENYLIST` environment variable as a comma-separated list. In CI the variable can come from a secret.

```text
# .leakproof-denylist
Acme Industries
project-nightingale
corp.internal.example
```

Matching ignores case and accents and only matches whole words. A Finding names the entry by its position (`denylist entry #3`), never by its text.

The Denylist cannot go in `.leakproofrc.json`: that file is committed, so the list of secrets would be published with it. leakproof rejects a `denylist` key there, and reports a critical Finding if `.leakproof-denylist` is tracked by git. Add it to `.gitignore`. See [ADR 0005](docs/adr/0005-denylist-outside-config.md).

Because the Fingerprint of a Denylist Finding comes from the entry's position and not from the term, reordering the Denylist invalidates the matching Baseline entries.

### Baseline

A Baseline lists Findings you have looked at and accepted. Create one from the current state:

```sh
leakproof --write-baseline .leakproof-baseline.json
```

```text
Wrote 2 entries to .leakproof-baseline.json. Write a reason for each one before the next scan.
```

Every entry starts with an empty `reason`:

```json
{
  "version": 1,
  "findings": [
    {
      "fingerprint": "96d4e82952e08c84",
      "ruleId": "secret/github-token",
      "path": "src/deploy.js",
      "reason": ""
    }
  ]
}
```

Fill in a Reason for each entry, then commit the file. leakproof refuses to run with an empty Reason:

```text
leakproof: .leakproof-baseline.json: 2 entries have no Reason. Every accepted Finding needs a written justification in its reason field (docs/adr/0006)
```

With the Reasons written, accepted Findings are counted but not reported:

```text
No Finding. 2 accepted by the Baseline.
```

`--baseline <file>` selects another file; the default is `.leakproof-baseline.json`.

Notes:

- An entry is matched by its Fingerprint alone: `sha256(ruleId + path + value)` truncated to 16 hex characters. The line number is left out, so moving code does not invalidate an entry. The value is hashed but never written.
- When an entry matches nothing any more, leakproof prints a warning on stderr and carries on. Delete the entry.
- `--write-baseline` prints no report. It accepts every current Finding, ignoring the existing Baseline when it decides what to list, and it works even when some Reasons are still empty. Rewriting a Baseline drops stale entries, keeps the Reasons already written and leaves the Reason of new entries empty. Fill those in before the next scan.

See [ADR 0006](docs/adr/0006-baseline-requires-reasons.md).

### Output and exit codes

`--fail-on <severity>` sets the lowest Severity that fails the run, overriding the configuration. The default is `low`, so any Finding fails.

`--format json` prints a machine-readable report:

```json
{
  "version": 1,
  "failOn": "low",
  "findings": [
    {
      "ruleId": "secret/github-token",
      "category": "secret",
      "severity": "critical",
      "title": "GitHub token",
      "advice": "Revoke it in GitHub settings (Developer settings → Personal access tokens).",
      "path": "src/deploy.js",
      "line": 1,
      "maskedValue": "ghp_********opqr",
      "fingerprint": "96d4e82952e08c84"
    }
  ],
  "summary": {
    "total": 1,
    "bySeverity": { "critical": 1, "high": 0, "medium": 0, "low": 0 },
    "accepted": 0,
    "staleBaselineEntries": 0
  }
}
```

Findings from a commit also carry a `commit` field. A Finding has no `path` or `line` when the Rule does not apply to one location.

| Exit code | Meaning                                                                            |
| --------- | ---------------------------------------------------------------------------------- |
| 0         | No Finding at or above the `failOn` Severity                                       |
| 1         | At least one Finding at or above the `failOn` Severity                             |
| 2         | Error: bad usage, invalid configuration, not a git repository, unreadable Baseline |

Text output is colored only on a terminal and when `NO_COLOR` is not set. JSON is never colored. Set `LEAKPROOF_DEBUG=1` to print the stack trace of an unexpected error; by default only the message is shown.

## Use as a pre-commit hook

Install leakproof in the project (`npm i -D leakproof`), then add the hook to your [pre-commit](https://pre-commit.com) configuration:

```yaml
repos:
  - repo: https://github.com/MPeyrot/leakproof
    rev: v0.1.0
    hooks:
      - id: leakproof
```

The hook runs the project's copy of leakproof (`npx --no-install leakproof --staged`) instead of building its own, so the `npm i -D` step is required. It only reads what you are about to commit. Without the framework, a plain git hook works too. Save this as `.git/hooks/pre-commit` and make it executable (`chmod +x .git/hooks/pre-commit`):

```sh
#!/bin/sh
npx --no-install leakproof --staged
```

`--no-install` makes it use the copy from `npm i -D leakproof` instead of downloading one on every commit.

## Use in CI

`--history` reads every commit, so the checkout must be complete. Without `fetch-depth: 0`, GitHub Actions fetches a single commit and the History scan sees almost nothing.

```yaml
name: leakproof
on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  leakproof:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - run: npx leakproof --history
```

Pin the actions to a commit SHA if your policy requires it. To use a Denylist in CI, add `LEAKPROOF_DENYLIST` as a repository secret and expose it with `env:` on the last step.

## Privacy

- Values are masked when they are detected. A Finding has no field for the raw value, so no report, log, Baseline or JSON output can contain one. The Masked value shows at most a public provider prefix (`AKIA`, `ghp_`), always eight stars so the length stays hidden, and the last four characters only for values of 20 characters or more. The line that matched is never printed. See [ADR 0001](docs/adr/0001-mask-values-at-detection.md).
- leakproof makes no network request.
- It has no runtime dependencies, which keeps the supply-chain surface of a tool that reads your secrets small ([ADR 0003](docs/adr/0003-zero-runtime-dependencies.md)).
- It requires git and delegates every file listing to it, through `execFile` and never through a shell. Outside a git repository it exits with code 2 ([ADR 0002](docs/adr/0002-require-git.md)).

## Known limitations

- Content introduced only by the resolution of a merge is not scanned. The History scan does not follow merge diffs.
- A Keynote `.key` file is reported as a private key, because `.key` is also the extension of key files.
- An IBAN stuck directly against uppercase words can be missed. The match then swallows the neighbouring letters and the checksum fails.
- A Fingerprint is not a vault. If the value has little entropy, such as a NIR, someone who has the Baseline can find it by brute force ([ADR 0006](docs/adr/0006-baseline-requires-reasons.md)).
- leakproof honors your global gitignore, as git does. A file ignored there is not scanned in the Worktree.
- Stripe `sk_test_` keys are ignored on purpose. Only live keys are reported.
- `ignoredPaths` use the glob dialect described above, not gitignore syntax.
- `[path]` names a repository. If it points to a sub-folder, leakproof goes up to the git root and scans the whole repository.
- `--write-baseline` prints no report, accepts all current Findings and works even with empty Reasons. Check the resulting file before committing it.
- `hygiene/missing-env-example` fires only when a real `.env` file exists on disk and is ignored by git. It never fires in CI, nor for a `.env` inside an ignored folder such as `node_modules/`. Merely listing `.env` in `.gitignore` is a good practice, not a sign that the project needs one.
- Hygiene Rules run on the Worktree only, not on `--staged` or `--history`.
- IP addresses, phone numbers and internal host names are not detected: they produce too many false positives ([ADR 0004](docs/adr/0004-precision-over-recall.md)). Put internal names in your Denylist.
- Symbolic links are never followed. The link target is scanned as a text file.

## 🇫🇷 En bref

leakproof vérifie qu'un dépôt git peut devenir public. Il cherche dans les fichiers, et si vous le demandez dans tout l'historique, les secrets (clés d'API, fichiers `.env`, clés privées), les données personnelles (IBAN, NIR, numéros de carte, e-mails perso, chemins avec un nom d'utilisateur) et vos propres termes confidentiels (fichier `.leakproof-denylist`, jamais commité).

Lancez `npx leakproof` à la racine du dépôt. Utilisez `--history` avant de publier, et `--staged` dans un hook pre-commit. Les valeurs trouvées ne sont jamais affichées, seulement masquées. Code de retour 0 si rien n'est trouvé, 1 sinon, 2 en cas d'erreur.

Une exception acceptée (fichier `.leakproof-baseline.json` ou `.leakproofrc.json`) doit toujours avoir une raison écrite. Les décisions de conception sont dans `docs/adr/` et le vocabulaire dans `CONTEXT.md`, tous deux en anglais.

## License

[MIT](LICENSE) © 2026 Peyrot
