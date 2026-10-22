/** Words that mark a value as a template slot rather than a real secret. */
const PLACEHOLDER_WORDS =
  /example|change_?me|your[_-]|placeholder|dummy|redacted|insert|_here\b|xxxx|\*\*\*|process\.env|os\.environ|getenv/i;

/** Values that are just the name of what should go there. */
const SLOT_NAMES = new Set([
  "password",
  "passwd",
  "pass",
  "pwd",
  "secret",
  "token",
  "apikey",
  "api_key",
  "key",
]);

/** Template syntaxes: ${VAR}, {{ var }}, %(var)s, <var>, $VAR, %VAR%. */
const TEMPLATE_SYNTAX = /\$\{|\{\{|%\(|^<.*>$|^\$[A-Za-z_][A-Za-z0-9_]*$|^%[A-Za-z_]+%$/;

/** A value that looks like a secret's slot but obviously is not one (docs/adr/0004). */
export function isPlaceholder(value: string): boolean {
  return (
    PLACEHOLDER_WORDS.test(value) ||
    TEMPLATE_SYNTAX.test(value) ||
    SLOT_NAMES.has(value.toLowerCase()) ||
    /^(.)\1+$/.test(value)
  );
}
