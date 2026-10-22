import { basename, endsWithSegments, type FileRule } from "./file-rule.js";

export const credentialsFile: FileRule = {
  id: "sensitive-file/credentials-file",
  category: "sensitive-file",
  severity: "high",
  title: "Cloud or cluster credentials file",
  advice: "Remove it, revoke the credentials, and load them from the environment instead.",
  check: ({ path }) => {
    const name = basename(path);
    const matches =
      name === "credentials.json" ||
      (name.startsWith("service-account") && name.endsWith(".json")) ||
      (name.startsWith("client_secret") && name.endsWith(".json")) ||
      endsWithSegments(path, ".aws/credentials") ||
      name === "kubeconfig" ||
      endsWithSegments(path, ".kube/config");
    return matches ? path : undefined;
  },
};
