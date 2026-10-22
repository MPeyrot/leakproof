import type { FileInfo } from "../rules/file/file-rule.js";

/** A file handed to the Rules by a Scan target. */
export interface ScannedFile extends FileInfo {
  /** Commit that introduced this content, for files from the History. */
  readonly commit?: string;
}

const BINARY_SNIFF_LENGTH = 8000;

/** Text content of a file, or undefined for binary content (a NUL byte near the start). */
export function decodeText(buffer: Buffer): string | undefined {
  return buffer.subarray(0, BINARY_SNIFF_LENGTH).includes(0) ? undefined : buffer.toString("utf8");
}
