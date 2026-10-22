import { basename, type FileRule } from "./file-rule.js";

const DATABASE_EXTENSIONS = [".sqlite", ".sqlite3", ".db", ".dump"];
/** Headers written by dump tools; plain migrations and schemas do not have them. */
const DUMP_MARKERS = /PostgreSQL database dump|MySQL dump|MariaDB dump|pg_dump|mysqldump/;

export const databaseDump: FileRule = {
  id: "sensitive-file/database-dump",
  category: "sensitive-file",
  severity: "high",
  title: "Database file or dump committed",
  advice: "Databases and dumps usually contain real user data; remove them from the History.",
  check: ({ path, content }) => {
    const name = basename(path);
    if (name === "Thumbs.db") return undefined; // OS metadata, see os-metadata
    if (DATABASE_EXTENSIONS.some((ext) => name.endsWith(ext))) return path;
    if (name.endsWith(".sql") && content !== undefined && DUMP_MARKERS.test(content)) return path;
    return undefined;
  },
};
