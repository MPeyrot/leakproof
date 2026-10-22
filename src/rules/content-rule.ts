import { maskSecret, type Masker } from "../scan/mask.js";
import { isPlaceholder } from "./placeholder.js";
import type { RuleMeta } from "./rule.js";

/** A raw value found in a text, with its offset. Only ever seen by the scan engine. */
export interface ContentMatch {
  readonly value: string;
  readonly index: number;
}

/** A Rule that looks for values inside a text file. */
export interface ContentRule extends RuleMeta {
  /** Turns a matched value into its Masked value (docs/adr/0001). */
  readonly mask: Masker;
  /** Every match in the content, in order of appearance. */
  find(content: string): ContentMatch[];
}

export interface PatternRuleDefinition extends RuleMeta {
  /**
   * Expressions to search for. When one has a named group `value`, only that group is the
   * matched value; otherwise the whole match is. Flags `g` and `d` are added automatically.
   */
  readonly patterns: readonly RegExp[];
  /** Public prefixes the mask may keep visible (`ghp_`, `AKIA`). */
  readonly publicPrefixes?: readonly string[];
  readonly mask?: Masker;
  /** Extra filter on matched values, after the Placeholder value filter. */
  readonly accept?: (value: string) => boolean;
  /** Set for Rules whose values are validated by other means (checksums, Denylist). */
  readonly keepPlaceholders?: boolean;
}

export function patternRule(definition: PatternRuleDefinition): ContentRule {
  const {
    patterns,
    publicPrefixes = [],
    accept = () => true,
    keepPlaceholders = false,
    mask = (raw: string) =>
      maskSecret(
        raw,
        publicPrefixes.find((prefix) => raw.startsWith(prefix)),
      ),
    ...meta
  } = definition;
  const searches = patterns.map(withSearchFlags);

  return {
    ...meta,
    mask,
    find(content) {
      const byIndex = new Map<number, ContentMatch>();
      for (const pattern of searches) {
        for (const match of content.matchAll(pattern)) {
          const span = match.indices?.groups?.value ?? match.indices?.[0];
          const value = match.groups?.value ?? match[0];
          if (span === undefined) continue;
          if (!keepPlaceholders && isPlaceholder(value)) continue;
          if (!accept(value)) continue;
          byIndex.set(span[0], { value, index: span[0] });
        }
      }
      return [...byIndex.values()].sort((a, b) => a.index - b.index);
    },
  };
}

function withSearchFlags(pattern: RegExp): RegExp {
  const extra = ["g", "d"].filter((flag) => !pattern.flags.includes(flag)).join("");
  return new RegExp(pattern.source, pattern.flags + extra);
}
