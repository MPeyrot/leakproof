# Baseline entries are fingerprints that must carry a Reason

The Baseline is committed, so it stores only a Fingerprint per Finding: `sha256(ruleId + path + value)` truncated to 16 hex characters. The line number is left out on purpose, so that moving code does not invalidate an entry and the same occurrence matches in the Worktree and in the History. `--write-baseline` writes every current Finding with an empty Reason, and leakproof refuses to load a Baseline with any empty Reason (exit code 2), so every accepted Finding gets a written justification. An entry that no longer matches anything only produces a warning.

## Consequences

A Fingerprint of a low-entropy value (a NIR, for instance) can be reversed by brute force. The Baseline is not a vault, and this is documented as a known limitation.
