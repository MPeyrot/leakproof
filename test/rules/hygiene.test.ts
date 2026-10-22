import { describe, expect, it } from "vitest";
import { HYGIENE_RULES } from "../../src/rules/hygiene/index.js";
import type { RepoInfo } from "../../src/rules/hygiene/repo-rule.js";

function violates(id: string, paths: string[], gitIgnored: string[] = []): boolean {
  const found = HYGIENE_RULES.find((r) => r.id === id);
  if (found === undefined) throw new Error(`no rule ${id}`);
  const repo: RepoInfo = { paths: new Set(paths), gitIgnored: new Set(gitIgnored) };
  return found.check(repo);
}

describe("hygiene rules", () => {
  it("have unique ids in the hygiene category", () => {
    const ids = HYGIENE_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of HYGIENE_RULES) {
      expect(r.category).toBe("hygiene");
      expect(r.id.startsWith("hygiene/")).toBe(true);
    }
  });
});

describe("hygiene/missing-gitignore", () => {
  it("fires without a root .gitignore", () => {
    expect(violates("hygiene/missing-gitignore", ["a.ts"])).toBe(true);
  });

  it("does not fire with one, and ignores nested ones", () => {
    expect(violates("hygiene/missing-gitignore", [".gitignore"])).toBe(false);
    expect(violates("hygiene/missing-gitignore", ["src/.gitignore"])).toBe(true);
  });
});

describe("hygiene/missing-license", () => {
  it("fires without a licence", () => {
    expect(violates("hygiene/missing-license", ["README.md", "src/a.ts"])).toBe(true);
  });

  it.each([
    "LICENSE",
    "LICENSE.md",
    "licence",
    "COPYING",
    "UNLICENSE",
    "LICENSE-MIT",
    "License.txt",
  ])("is satisfied by %s", (name) => {
    expect(violates("hygiene/missing-license", [name])).toBe(false);
  });

  it.each(["docs/LICENSE", "LICENSED.md", "licenses/MIT.txt"])("is not satisfied by %s", (path) => {
    expect(violates("hygiene/missing-license", [path])).toBe(true);
  });
});

describe("hygiene/missing-readme", () => {
  it("fires without a README", () => {
    expect(violates("hygiene/missing-readme", ["a.ts"])).toBe(true);
  });

  it.each(["README.md", "readme", "README.rst", ".github/README.md", "docs/README.md"])(
    "is satisfied by %s",
    (path) => {
      expect(violates("hygiene/missing-readme", [path])).toBe(false);
    },
  );

  it.each(["src/README.md", "READMEs.md"])("is not satisfied by %s", (path) => {
    expect(violates("hygiene/missing-readme", [path])).toBe(true);
  });
});

describe("hygiene/missing-env-example", () => {
  const id = "hygiene/missing-env-example";

  it.each([".env", ".env.local", "api/.env", "apps/web/.env.production"])(
    "fires when %s sits on disk, ignored by git, and no template is tracked",
    (path) => {
      expect(violates(id, [".gitignore", "a.ts"], ["node_modules/", path])).toBe(true);
    },
  );

  it("does not fire when a template is tracked, at any depth", () => {
    expect(violates(id, [".env.example"], [".env"])).toBe(false);
    expect(violates(id, ["config/.env.example"], [".env"])).toBe(false);
    expect(violates(id, ["api/.env.sample"], ["api/.env"])).toBe(false);
  });

  it("does not fire when the project only ignores env files as a precaution", () => {
    expect(violates(id, [".gitignore", "a.ts"])).toBe(false);
    expect(violates(id, [".gitignore"], ["node_modules/", "dist/", ".DS_Store"])).toBe(false);
  });

  it("does not count ignored templates, .envrc or env-like directories", () => {
    expect(violates(id, ["a.ts"], [".env.example", ".envrc", ".env/", "my.env.ts"])).toBe(false);
  });
});
