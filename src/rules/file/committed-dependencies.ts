import type { FileRule } from "./file-rule.js";

export const committedDependencies: FileRule = {
  id: "sensitive-file/committed-dependencies",
  category: "sensitive-file",
  severity: "low",
  title: "Dependencies or build output committed",
  advice: "Add the directory to .gitignore and remove it from the index (git rm -r --cached).",
  check: ({ path }) => {
    const nodeModules = path.match(/^(?:.*\/)?node_modules\//);
    if (nodeModules !== null) return nodeModules[0];
    return path.startsWith("dist/") ? "dist/" : undefined;
  },
};
