import type { FileRule } from "./file-rule.js";

export const largeFile: FileRule = {
  id: "sensitive-file/large-file",
  category: "sensitive-file",
  severity: "low",
  title: "Unexpectedly large file",
  advice: "Check that it belongs in the repository; store large assets with Git LFS.",
  check: ({ path, size, isLfs }, { largeFileThreshold }) =>
    size !== undefined && size > largeFileThreshold && isLfs !== true ? path : undefined,
};
