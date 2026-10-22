# Security policy

## Supported versions

Only the latest 0.x release receives fixes.

## Reporting a vulnerability

Use GitHub private vulnerability reporting: open the Security tab of [MPeyrot/leakproof](https://github.com/MPeyrot/leakproof), choose "Report a vulnerability" and describe the problem. Please do not open a public issue for it.

Never paste a real secret, key or personal data into a report. Build a fake value from pieces, the way the tests do, and say which Rule it should trigger.

## What counts

- A raw matched value that appears anywhere in the output, the Baseline, the JSON report or an error message.
- A crafted repository (file names, config files, git history, branch names, `.gitattributes`) that makes leakproof run a command or write outside the repository.
- A Denylist term that can be recovered from a report or from a Baseline.
- A Fingerprint or Masked value that exposes more of a secret than documented in [ADR 0001](docs/adr/0001-mask-values-at-detection.md) and [ADR 0006](docs/adr/0006-baseline-requires-reasons.md).

## What does not count

- A secret or personal data that leakproof does not detect. Missed detections are ordinary bugs, and precision is preferred over recall ([ADR 0004](docs/adr/0004-precision-over-recall.md)). Open a normal issue.
- The limitations listed in the README, such as a low-entropy value being recoverable from its Fingerprint.
