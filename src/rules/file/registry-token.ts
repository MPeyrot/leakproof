import { basename, type FileRule } from "./file-rule.js";

/** Credential lines whose value is written in the file rather than read from the environment. */
const CREDENTIAL_LINES: Record<string, RegExp> = {
  ".npmrc": /(?:_authToken|_auth|_password)\s*=\s*(?!\$\{)\S+/,
  ".pypirc": /^\s*password\s*[=:]\s*(?!\$\{)\S+/m,
  ".netrc": /\bpassword\s+\S+/,
  _netrc: /\bpassword\s+\S+/,
};

export const registryToken: FileRule = {
  id: "sensitive-file/registry-token",
  category: "sensitive-file",
  severity: "high",
  title: "Package registry or netrc file with credentials",
  advice: "Revoke the token and reference it from an environment variable (${NPM_TOKEN}).",
  check: ({ path, content }) => {
    const pattern = CREDENTIAL_LINES[basename(path)];
    if (pattern === undefined || content === undefined) return undefined;
    return pattern.test(content) ? path : undefined;
  },
};
