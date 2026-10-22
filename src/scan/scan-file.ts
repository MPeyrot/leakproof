import type { ScannedFile } from "../targets/scanned-file.js";
import { createFinding, type Finding } from "./finding.js";
import type { RuleSet } from "./rule-set.js";
import type { ScanSettings } from "./settings.js";

/** Maps character offsets to 1-based line numbers. */
function lineLocator(content: string): (index: number) => number {
  const starts = [0];
  for (let i = content.indexOf("\n"); i !== -1; i = content.indexOf("\n", i + 1))
    starts.push(i + 1);
  return (index) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if ((starts[mid] ?? 0) <= index) low = mid;
      else high = mid - 1;
    }
    return low + 1;
  };
}

/** Applies every Rule to one file. Raw matched values do not outlive this function. */
export function scanFile(file: ScannedFile, rules: RuleSet, settings: ScanSettings): Finding[] {
  const findings: Finding[] = [];
  const commit = file.commit !== undefined ? { commit: file.commit } : {};

  for (const rule of rules.fileRules) {
    const path = rule.check(file, settings);
    if (path !== undefined) findings.push(createFinding({ rule, path, ...commit }));
  }

  if (file.content !== undefined && file.content !== "") {
    const lineOf = lineLocator(file.content);
    for (const rule of rules.contentRules) {
      for (const { value, index } of rule.find(file.content)) {
        findings.push(
          createFinding({
            rule,
            path: file.path,
            line: lineOf(index),
            value,
            mask: rule.mask,
            ...commit,
          }),
        );
      }
    }
  }
  return findings;
}
