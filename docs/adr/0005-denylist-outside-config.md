# Keep the Denylist out of the configuration file

The Denylist holds the very names that must stay private (clients, confidential projects, internal domains), so storing it in `.leakproofrc.json`, which is meant to be committed, would make leakproof publish it. The Denylist is read from a separate `.leakproof-denylist` file (one term per line) or from the `LEAKPROOF_DENYLIST` environment variable, which CI can provide as a secret. If that file is tracked by git, leakproof reports a critical Finding. Denylist Findings name the entry by its position (`denylist entry #3`), never by its text. Matching ignores case and accents and only matches whole words.

## Consequences

The Fingerprint of a Denylist Finding is computed from the entry's position, not from the term. Otherwise the committed Baseline would let anyone confirm a guessed client name by hashing it. As a result, reordering the Denylist invalidates the matching Baseline entries.
