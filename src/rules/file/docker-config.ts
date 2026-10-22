import { basename, endsWithSegments, type FileRule } from "./file-rule.js";

export const dockerConfig: FileRule = {
  id: "sensitive-file/docker-config",
  category: "sensitive-file",
  severity: "high",
  title: "Docker config with registry credentials",
  advice: "Revoke the registry credentials and use a credential helper (credsStore).",
  check: ({ path, content }) => {
    const isDockerConfig =
      endsWithSegments(path, ".docker/config.json") || basename(path) === ".dockercfg";
    if (!isDockerConfig || content === undefined) return undefined;
    return /"auth"\s*:\s*"[^"]+"/.test(content) ? path : undefined;
  },
};
