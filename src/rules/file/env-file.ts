import { basename, type FileRule } from "./file-rule.js";

const TEMPLATE_SUFFIXES = new Set(["example", "sample", "template", "dist", "defaults"]);

export const envFile: FileRule = {
  id: "sensitive-file/env-file",
  category: "sensitive-file",
  severity: "critical",
  title: "Environment file committed",
  advice: "Remove it, add it to .gitignore, rotate its values, and commit a .env.example instead.",
  check: ({ path }) => {
    const name = basename(path);
    if (name === ".env" || name === ".envrc") return path;
    if (name.startsWith(".env.")) {
      return TEMPLATE_SUFFIXES.has(name.slice(".env.".length)) ? undefined : path;
    }
    return name.endsWith(".env") && name.length > ".env".length ? path : undefined;
  },
};
