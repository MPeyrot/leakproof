# Contributing

Thanks for helping. This file covers what you need to change leakproof. Vocabulary (Finding, Rule, Severity, Baseline, Fingerprint...) is defined in [CONTEXT.md](CONTEXT.md), and the reasons behind the main design choices are in [docs/adr/](docs/adr/).

## Setup

You need Node.js 22 or later and git.

```sh
git clone https://github.com/MPeyrot/leakproof.git
cd leakproof
npm ci
```

## Checks

Run all three before opening a pull request:

```sh
npm run lint        # ESLint and Prettier (also checks Markdown, YAML and JSON)
npm run typecheck
npm test            # builds dist/ first, then runs unit, integration and end-to-end tests
```

`npm run format` fixes Prettier complaints. As a last check, `npm run build && node dist/cli/main.js . --history` must print `No Finding.`

## Rules for changes

- Precision over recall ([ADR 0004](docs/adr/0004-precision-over-recall.md)). A Rule that raises false positives gets disabled by users, and then it catches nothing. If a pattern is noisy, tighten it or leave it out.
- No runtime dependencies ([ADR 0003](docs/adr/0003-zero-runtime-dependencies.md)). Adding a package to `dependencies` needs a new ADR.
- A matched value is never stored or printed ([ADR 0001](docs/adr/0001-mask-values-at-detection.md)). The `Finding` type has no field for it, and it should stay that way.
- One Rule per file, or one small file per provider for related secrets. Each Rule has tests with positive cases and false-positive cases.
- Secret fixtures are built at runtime from pieces with the helper in `test/helpers/fake.ts`, never written as one literal, and carry the `TESTONLY` marker. This keeps the repository clean for leakproof itself and for GitHub push protection.
- Synthetic IBANs, card numbers and NIRs are built with `test/helpers/checksums.ts`, which computes valid check digits for made-up numbers.
- No real personal data anywhere: no real e-mail addresses, IBANs, names or absolute paths containing a user name, in code, tests or docs.
- Git is always called through `execFile`, never through a shell.

## Adding a Rule

1. Pick the folder that matches the Category in `src/rules/`: `file/`, `secret/`, `personal-data/`, `denylist/`, `git-identity/` or `hygiene/`.
2. Create the file. Give the Rule a stable id in the form `category/name`, a Severity, a title and an `advice` sentence that says what to do. Content Rules usually use `patternRule()`; file Rules implement `FileRule`. Add an `accept` filter if the regex alone would be noisy.
3. Register it in the `index.ts` of that folder, so that it joins the default Rule set.
4. Write tests next to the others in `test/rules/`: at least one case that must match and several that must not (placeholders, look-alikes, documentation examples).
5. Add a row to the matching table in the README, with the id, the Severity and a short description.

## Commits

Use conventional commits, as in `git log`: `feat: add SendGrid key Rule`, `fix: report a missing .env.example only when an env file is used`, `docs:`, `ci:`, `chore:`, `test:`. One change per commit, with the tests and the typecheck passing on each commit.
