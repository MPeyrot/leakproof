import { basename, type FileRule } from "../file/file-rule.js";
import { DENYLIST_FILE } from "./load.js";

export const trackedDenylist: FileRule = {
  id: "denylist/tracked-file",
  category: "denylist",
  severity: "critical",
  title: "Denylist file committed",
  advice: `The Denylist lists confidential names: remove it from git and add ${DENYLIST_FILE} to .gitignore.`,
  check: ({ path }) => (basename(path) === DENYLIST_FILE ? path : undefined),
};
