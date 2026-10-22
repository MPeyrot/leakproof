const SEGMENT_TOKENS = /\*+|\?|[.+^${}()|[\]\\]/g;

/** One path segment without `**`: `*` and `?` stay inside the segment, the rest is literal. */
function segmentSource(segment: string): string {
  return segment.replace(SEGMENT_TOKENS, (token) => {
    if (token.startsWith("*")) return "[^/]*";
    return token === "?" ? "[^/]" : `\\${token}`;
  });
}

function patternSource(pattern: string): string | undefined {
  const segments = pattern
    .replace(/^(?:\.?\/)+/, "")
    .split("/")
    .filter((segment) => segment !== "");
  if (segments.length === 0) return undefined;

  const last = segments.length - 1;
  const body = segments
    .map((segment, index) => {
      if (segment === "**") return index === last ? ".*" : "(?:[^/]+/)*";
      return `${segmentSource(segment)}${index === last ? "" : "/"}`;
    })
    .join("");
  return `^(?:${body})(?:/.*)?$`;
}

/**
 * Compiles the `ignoredPaths` patterns of the configuration into one predicate.
 *
 * - Patterns are matched against the repository-relative path, with `/` separators, and are
 *   anchored at the root: `*.log` matches `a.log` but not `src/a.log` (use `**` + `/*.log`).
 * - `*` matches any run of characters except `/`, `?` one character except `/`.
 *   `**` as a whole segment matches zero or more segments (`docs/**`, `**` + `/fixtures/**`).
 * - A path is ignored when the pattern matches the path itself or one of its parent
 *   directories, so `vendor` and `vendor/` both ignore `vendor/a/b.js`.
 * - Every other character is literal. A leading `./` or `/` on the pattern is dropped.
 */
export function compileIgnoredPaths(patterns: readonly string[]): (path: string) => boolean {
  const regexes = patterns
    .map(patternSource)
    .filter((source): source is string => source !== undefined)
    .map((source) => new RegExp(source, "s"));
  return (path) => regexes.some((regex) => regex.test(path));
}
