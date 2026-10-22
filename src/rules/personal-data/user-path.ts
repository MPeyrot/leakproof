import { patternRule } from "../content-rule.js";

/** Account names shared by CI runners, containers and documentation, which identify no one. */
const GENERIC_NAMES = new Set([
  "shared",
  "public",
  "default",
  "guest",
  "user",
  "username",
  "yourname",
  "your-name",
  "name",
  "me",
  "you",
  "admin",
  "root",
  "runner",
  "ubuntu",
  "ec2-user",
  "vagrant",
  "node",
  "app",
  "build",
  "docker",
  "jenkins",
  "circleci",
  "travis",
  "vscode",
  "codespace",
]);

/** Splits `/Users/name` or `C:\Users\name` into the prefix and the account name. */
function splitUserPath(value: string): [prefix: string, name: string] {
  const cut = Math.max(value.lastIndexOf("/"), value.lastIndexOf("\\")) + 1;
  return [value.slice(0, cut), value.slice(cut)];
}

function isPersonalAccount(value: string): boolean {
  const [, name] = splitUserPath(value);
  return !GENERIC_NAMES.has(name.toLowerCase()) && !/[$%{}]/.test(name);
}

export const userPath = patternRule({
  id: "personal-data/user-path",
  category: "personal-data",
  severity: "medium",
  title: "Absolute path revealing a user name",
  advice: "Use a path relative to the project, or ~ in documentation.",
  patterns: [
    /(?<![\w.])(?:\/Users\/|\/home\/|[A-Za-z]:(?:\\{1,2}|\/)Users(?:\\{1,2}|\/))[^/\\\s"'`<>:*?|]+/,
  ],
  mask: (raw) => {
    const [prefix, name] = splitUserPath(raw);
    return `${prefix}${name.charAt(0)}***`;
  },
  accept: isPersonalAccount,
});
