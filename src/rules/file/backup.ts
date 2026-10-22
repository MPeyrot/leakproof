import { basename, type FileRule } from "./file-rule.js";

const BACKUP_EXTENSIONS = [".bak", ".backup"];
const ARCHIVE_EXTENSIONS = [".zip", ".tar", ".tar.gz", ".tgz", ".7z", ".rar"];
const BACKUP_WORDS = /backup|dump|sauvegarde/i;

export const backup: FileRule = {
  id: "sensitive-file/backup",
  category: "sensitive-file",
  severity: "medium",
  title: "Backup file or archive committed",
  advice: "Backups often contain configuration or data that was never meant to be public.",
  check: ({ path }) => {
    const name = basename(path);
    if (BACKUP_EXTENSIONS.some((ext) => name.endsWith(ext))) return path;
    const isArchive = ARCHIVE_EXTENSIONS.some((ext) => name.endsWith(ext));
    return isArchive && BACKUP_WORDS.test(name) ? path : undefined;
  },
};
