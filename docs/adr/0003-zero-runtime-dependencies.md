# Zero runtime dependencies

A security tool that runs over a repository's secrets should have as little supply-chain surface as possible, so leakproof ships with no runtime dependencies. Argument parsing uses Node's built-in `util.parseArgs` instead of `commander`, and the build is plain `tsc` with no bundler. Development tools (TypeScript, vitest, ESLint, Prettier) are fine because they never reach users. The minimum runtime is Node 22, since Node 20 reached end of life in April 2026.

## Consequences

Adding any package to `dependencies` reverses this decision and needs a new ADR.
