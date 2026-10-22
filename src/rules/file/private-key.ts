import { basename, type FileRule } from "./file-rule.js";

const KEY_EXTENSIONS = [".key", ".p12", ".pfx", ".jks", ".keystore", ".ppk"];
const SSH_KEY_NAMES = new Set(["id_rsa", "id_dsa", "id_ecdsa", "id_ed25519"]);

export const privateKey: FileRule = {
  id: "sensitive-file/private-key",
  category: "sensitive-file",
  severity: "critical",
  title: "Private key or keystore file",
  advice: "Remove it from the repository and its History, then revoke and replace the key.",
  check: ({ path, content }) => {
    const name = basename(path);
    if (SSH_KEY_NAMES.has(name)) return path;
    if (KEY_EXTENSIONS.some((ext) => name.endsWith(ext))) return path;
    if (name.endsWith(".pem")) {
      // A .pem may hold only a public certificate; flag it unless the content proves that.
      return content === undefined || content.includes("PRIVATE KEY") ? path : undefined;
    }
    return undefined;
  },
};
