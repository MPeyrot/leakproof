// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL = /[\x00-\x1f\x7f]/g;

/**
 * Escapes control characters in text that comes from the scanned repository (file names,
 * Baseline entries), so that a hostile name cannot send escape sequences to the terminal.
 */
export function printable(text: string): string {
  return text.replace(CONTROL, (char) => {
    if (char === "\n") return "\\n";
    if (char === "\r") return "\\r";
    if (char === "\t") return "\\t";
    return `\\x${char.charCodeAt(0).toString(16).padStart(2, "0")}`;
  });
}
