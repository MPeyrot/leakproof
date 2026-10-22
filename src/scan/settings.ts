import type { FileRuleSettings } from "../rules/file/file-rule.js";

export interface ScanSettings extends FileRuleSettings {
  /** Files above this size (bytes) are not read; only file Rules apply to them. */
  readonly maxScanFileSize: number;
}

export const DEFAULT_SETTINGS: ScanSettings = {
  maxScanFileSize: 1024 * 1024,
  largeFileThreshold: 5 * 1024 * 1024,
};
