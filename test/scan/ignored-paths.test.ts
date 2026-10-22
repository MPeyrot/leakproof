import { describe, expect, it } from "vitest";
import { compileIgnoredPaths } from "../../src/scan/ignored-paths.js";

const ignored = (patterns: string[], path: string) => compileIgnoredPaths(patterns)(path);

describe("compileIgnoredPaths", () => {
  it("matches an exact path", () => {
    expect(ignored(["src/a.ts"], "src/a.ts")).toBe(true);
    expect(ignored(["src/a.ts"], "src/b.ts")).toBe(false);
  });

  it("anchors patterns at the root", () => {
    expect(ignored(["*.log"], "a.log")).toBe(true);
    expect(ignored(["*.log"], "a/b.log")).toBe(false);
    expect(ignored(["a.ts"], "src/a.ts")).toBe(false);
  });

  it("matches any depth with a ** segment", () => {
    expect(ignored(["**/*.log"], "a.log")).toBe(true);
    expect(ignored(["**/*.log"], "a/b/c.log")).toBe(true);
    expect(ignored(["**/fixtures/**"], "test/fixtures/a.txt")).toBe(true);
    expect(ignored(["**/fixtures/**"], "fixtures/a/b.txt")).toBe(true);
    expect(ignored(["**/fixtures/**"], "test/fixturesx/a.txt")).toBe(false);
    expect(ignored(["**/*.snap"], "t/__snapshots__/a.snap")).toBe(true);
    expect(ignored(["a/**/b.txt"], "a/b.txt")).toBe(true);
    expect(ignored(["a/**/b.txt"], "a/x/y/b.txt")).toBe(true);
  });

  it("matches everything below a directory pattern", () => {
    expect(ignored(["docs/**"], "docs/a.md")).toBe(true);
    expect(ignored(["docs/**"], "docs/a/b.md")).toBe(true);
    expect(ignored(["docs/**"], "docsx/a")).toBe(false);
    expect(ignored(["docs/**"], "src/docs/a.md")).toBe(false);
  });

  it("ignores the files below a matched directory, with or without a trailing slash", () => {
    expect(ignored(["vendor"], "vendor/a/b.js")).toBe(true);
    expect(ignored(["vendor/"], "vendor/a/b.js")).toBe(true);
    expect(ignored(["vendor"], "vendors/a.js")).toBe(false);
    expect(ignored(["vendor"], "src/vendor/a.js")).toBe(false);
  });

  it("keeps * and ? inside a segment", () => {
    expect(ignored(["src/*.ts"], "src/a/b.ts")).toBe(false);
    expect(ignored(["src/*/b.ts"], "src/a/b.ts")).toBe(true);
    expect(ignored(["a?.ts"], "ab.ts")).toBe(true);
    expect(ignored(["a?.ts"], "a/.ts")).toBe(false);
    expect(ignored(["a?.ts"], "a.ts")).toBe(false);
  });

  it("treats other regex characters literally", () => {
    expect(ignored(["a.b"], "a.b")).toBe(true);
    expect(ignored(["a.b"], "axb")).toBe(false);
    expect(ignored(["a+b(1)[x]"], "a+b(1)[x]")).toBe(true);
    expect(ignored(["a|b"], "a")).toBe(false);
    expect(ignored(["$HOME"], "$HOME")).toBe(true);
  });

  it("drops a leading ./ or /", () => {
    expect(ignored(["./docs/**"], "docs/a.md")).toBe(true);
    expect(ignored(["/docs"], "docs/a.md")).toBe(true);
  });

  it("matches nothing without patterns or with an empty one", () => {
    expect(ignored([], "a.ts")).toBe(false);
    expect(ignored(["", "/"], "a.ts")).toBe(false);
  });

  it("accepts several patterns", () => {
    const matches = compileIgnoredPaths(["docs/**", "*.snap"]);
    expect(matches("docs/a.md")).toBe(true);
    expect(matches("a.snap")).toBe(true);
    expect(matches("src/a.ts")).toBe(false);
  });
});
