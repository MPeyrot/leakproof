import type { ContentMatch, ContentRule } from "../content-rule.js";

interface FoldedText {
  /** Lower-cased text without accents. */
  readonly text: string;
  /** For each index in `text`, the matching index in the original text. */
  readonly origin: (index: number) => number;
}

/** Removes case and accents while remembering where each character came from. */
function fold(text: string): FoldedText {
  // Fast path: ASCII text keeps its length when lower-cased.
  if (/^\p{ASCII}*$/u.test(text)) return { text: text.toLowerCase(), origin: (index) => index };

  let folded = "";
  const origins: number[] = [];
  let offset = 0;
  for (const char of text) {
    const plain = char.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    for (let i = 0; i < plain.length; i++) origins.push(offset);
    folded += plain;
    offset += char.length;
  }
  return { text: folded, origin: (index) => origins[index] ?? offset };
}

function wholeWordPattern(term: string): RegExp {
  const escaped = fold(term)
    .text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, String.raw`\s+`);
  return new RegExp(String.raw`(?<![\p{L}\p{N}_])${escaped}(?![\p{L}\p{N}_])`, "gu");
}

/**
 * Every occurrence of a Denylist term. The matched value is the entry's position (`#3`), never
 * the term: the term must not appear in reports, nor be guessable from a Baseline Fingerprint.
 */
export function denylistRule(terms: readonly string[]): ContentRule {
  const patterns = terms.map(wholeWordPattern);
  return {
    id: "denylist/term",
    category: "denylist",
    severity: "high",
    title: "Denylist term",
    advice: "Remove or rename it. Reordering the Denylist changes the entry numbers.",
    mask: (position) => `denylist entry ${position}`,
    find(content) {
      if (patterns.length === 0) return [];
      const folded = fold(content);
      const matches: ContentMatch[] = [];
      patterns.forEach((pattern, i) => {
        for (const match of folded.text.matchAll(pattern)) {
          matches.push({ value: `#${String(i + 1)}`, index: folded.origin(match.index) });
        }
      });
      return matches.sort((a, b) => a.index - b.index);
    },
  };
}
