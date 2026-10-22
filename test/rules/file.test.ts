import { describe, expect, it } from "vitest";
import type { FileInfo, FileRule } from "../../src/rules/file/file-rule.js";
import { FILE_RULES } from "../../src/rules/file/index.js";
import { fake } from "../helpers/fake.js";

const settings = { largeFileThreshold: 5 * 1024 * 1024 };

function rule(id: string): FileRule {
  const found = FILE_RULES.find((r) => r.id === id);
  if (found === undefined) throw new Error(`no rule ${id}`);
  return found;
}

function check(id: string, file: FileInfo): string | undefined {
  return rule(id).check(file, settings);
}

describe("file rules", () => {
  it("have unique ids in the sensitive-file category", () => {
    const ids = FILE_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of FILE_RULES) {
      expect(r.category).toBe("sensitive-file");
      expect(r.id.startsWith("sensitive-file/")).toBe(true);
    }
  });
});

describe("sensitive-file/env-file", () => {
  it.each([".env", ".env.local", ".env.production", "app/.env", "deploy/prod.env", ".envrc"])(
    "flags %s",
    (path) => {
      expect(check("sensitive-file/env-file", { path })).toBe(path);
    },
  );

  it.each([".env.example", ".env.sample", ".env.template", "app/.env.dist", "env.ts", "src/.envy"])(
    "ignores %s",
    (path) => {
      expect(check("sensitive-file/env-file", { path })).toBeUndefined();
    },
  );
});

describe("sensitive-file/private-key", () => {
  it.each([
    "id_rsa",
    ".ssh/id_ed25519",
    "keys/server.key",
    "certs/store.p12",
    "certs/store.pfx",
    "android/release.jks",
    "android/app.keystore",
    "putty.ppk",
  ])("flags %s", (path) => {
    expect(check("sensitive-file/private-key", { path })).toBe(path);
  });

  it.each(["id_rsa.pub", ".ssh/id_ed25519.pub", "keyboard.ts", "monkey.json"])(
    "ignores %s",
    (path) => {
      expect(check("sensitive-file/private-key", { path })).toBeUndefined();
    },
  );

  it("flags a .pem holding a private key, or whose content is unknown", () => {
    const content = fake("-----BEGIN ", "PRIVATE KEY-----\nAAAA\n");
    expect(check("sensitive-file/private-key", { path: "tls.pem", content })).toBe("tls.pem");
    expect(check("sensitive-file/private-key", { path: "tls.pem" })).toBe("tls.pem");
  });

  it("ignores a .pem that only holds a public certificate", () => {
    const content = fake("-----BEGIN ", "CERTIFICATE-----\nAAAA\n");
    expect(check("sensitive-file/private-key", { path: "ca.pem", content })).toBeUndefined();
  });
});

describe("sensitive-file/git-credentials", () => {
  it("flags .git-credentials anywhere", () => {
    expect(check("sensitive-file/git-credentials", { path: "home/.git-credentials" })).toBe(
      "home/.git-credentials",
    );
  });

  it("ignores .gitconfig", () => {
    expect(check("sensitive-file/git-credentials", { path: ".gitconfig" })).toBeUndefined();
  });
});

describe("sensitive-file/terraform-state", () => {
  it.each(["terraform.tfstate", "infra/prod.tfstate.backup"])("flags %s", (path) => {
    expect(check("sensitive-file/terraform-state", { path })).toBe(path);
  });

  it("ignores Terraform sources", () => {
    expect(check("sensitive-file/terraform-state", { path: "main.tf" })).toBeUndefined();
  });
});

describe("sensitive-file/credentials-file", () => {
  it.each([
    "credentials.json",
    "gcp/service-account-prod.json",
    "client_secret_123.apps.json",
    ".aws/credentials",
    "kubeconfig",
    ".kube/config",
  ])("flags %s", (path) => {
    expect(check("sensitive-file/credentials-file", { path })).toBe(path);
  });

  it.each(["src/credentials.ts", "docs/credentials.md", "config/config", ".aws/config"])(
    "ignores %s",
    (path) => {
      expect(check("sensitive-file/credentials-file", { path })).toBeUndefined();
    },
  );
});

describe("sensitive-file/registry-token", () => {
  it("flags an .npmrc with an auth token", () => {
    const content = fake("//registry.npmjs.org/:_auth", "Token=", "abc123");
    expect(check("sensitive-file/registry-token", { path: ".npmrc", content })).toBe(".npmrc");
  });

  it("flags a .pypirc or .netrc with a password", () => {
    const content = fake("[pypi]\nusername = someone\npass", "word = abc123\n");
    expect(check("sensitive-file/registry-token", { path: ".pypirc", content })).toBe(".pypirc");
    const netrc = fake("machine example.test login someone pass", "word abc123\n");
    expect(check("sensitive-file/registry-token", { path: ".netrc", content: netrc })).toBe(
      ".netrc",
    );
  });

  it("ignores an .npmrc without credentials, or whose content is unknown", () => {
    const content = "save-exact=true\nengine-strict=true\n";
    expect(check("sensitive-file/registry-token", { path: ".npmrc", content })).toBeUndefined();
    expect(check("sensitive-file/registry-token", { path: ".npmrc" })).toBeUndefined();
  });

  it("ignores an .npmrc that reads its token from the environment", () => {
    const content = fake("//registry.npmjs.org/:_auth", "Token=${NPM_TOKEN}\n");
    expect(check("sensitive-file/registry-token", { path: ".npmrc", content })).toBeUndefined();
  });
});

describe("sensitive-file/docker-config", () => {
  it("flags a Docker config holding registry auth", () => {
    const content = fake('{"auths":{"registry.example.test":{"au', 'th":"Zm9vOmJhcg=="}}}');
    expect(check("sensitive-file/docker-config", { path: ".docker/config.json", content })).toBe(
      ".docker/config.json",
    );
  });

  it("ignores a Docker config using a credential helper", () => {
    const content = '{"credsStore":"desktop"}';
    expect(
      check("sensitive-file/docker-config", { path: ".docker/config.json", content }),
    ).toBeUndefined();
  });

  it("ignores other config.json files", () => {
    const content = '{"auth":"x"}';
    expect(check("sensitive-file/docker-config", { path: "config.json", content })).toBeUndefined();
  });
});

describe("sensitive-file/database-dump", () => {
  it.each(["data/app.sqlite", "app.sqlite3", "local.db", "prod.dump"])("flags %s", (path) => {
    expect(check("sensitive-file/database-dump", { path })).toBe(path);
  });

  it("flags a .sql file produced by a dump tool", () => {
    const content = "-- PostgreSQL database dump\nCREATE TABLE users (id int);\n";
    expect(check("sensitive-file/database-dump", { path: "backup.sql", content })).toBe(
      "backup.sql",
    );
  });

  it("ignores .sql migrations and schemas", () => {
    const content = "CREATE TABLE users (id int);\n";
    expect(
      check("sensitive-file/database-dump", { path: "migrations/001.sql", content }),
    ).toBeUndefined();
    expect(check("sensitive-file/database-dump", { path: "schema.sql" })).toBeUndefined();
  });
});

describe("sensitive-file/backup", () => {
  it.each(["site.bak", "db.backup", "backup-2024.zip", "prod_dump.tar.gz", "sauvegarde.7z"])(
    "flags %s",
    (path) => {
      expect(check("sensitive-file/backup", { path })).toBe(path);
    },
  );

  it.each(["release.zip", "assets.tar.gz", "src/backup.ts"])("ignores %s", (path) => {
    expect(check("sensitive-file/backup", { path })).toBeUndefined();
  });
});

describe("sensitive-file/os-metadata", () => {
  it.each([".DS_Store", "assets/.DS_Store", "photos/Thumbs.db"])("flags %s", (path) => {
    expect(check("sensitive-file/os-metadata", { path })).toBe(path);
  });
});

describe("sensitive-file/committed-dependencies", () => {
  it("reports the node_modules directory once, not each file", () => {
    expect(
      check("sensitive-file/committed-dependencies", { path: "node_modules/lodash/index.js" }),
    ).toBe("node_modules/");
    expect(
      check("sensitive-file/committed-dependencies", { path: "web/node_modules/a/b.js" }),
    ).toBe("web/node_modules/");
  });

  it("reports a top-level dist directory", () => {
    expect(check("sensitive-file/committed-dependencies", { path: "dist/index.js" })).toBe("dist/");
  });

  it("ignores nested dist directories and look-alikes", () => {
    expect(
      check("sensitive-file/committed-dependencies", { path: "src/dist/x.ts" }),
    ).toBeUndefined();
    expect(
      check("sensitive-file/committed-dependencies", { path: "my_node_modules.md" }),
    ).toBeUndefined();
  });
});

describe("sensitive-file/large-file", () => {
  it("flags files above the threshold", () => {
    expect(check("sensitive-file/large-file", { path: "video.mp4", size: 6_000_000 })).toBe(
      "video.mp4",
    );
  });

  it("ignores small files, unknown sizes and Git LFS files", () => {
    expect(check("sensitive-file/large-file", { path: "a.png", size: 1000 })).toBeUndefined();
    expect(check("sensitive-file/large-file", { path: "a.png" })).toBeUndefined();
    expect(
      check("sensitive-file/large-file", { path: "v.mp4", size: 6_000_000, isLfs: true }),
    ).toBeUndefined();
  });
});
