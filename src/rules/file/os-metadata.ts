import { basename, type FileRule } from "./file-rule.js";

const OS_METADATA = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);

export const osMetadata: FileRule = {
  id: "sensitive-file/os-metadata",
  category: "sensitive-file",
  severity: "low",
  title: "Operating system metadata file",
  advice: "It can reveal names of local files and folders; add it to .gitignore.",
  check: ({ path }) => (OS_METADATA.has(basename(path)) ? path : undefined),
};
