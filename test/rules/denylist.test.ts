import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadDenylist, parseDenylist } from "../../src/rules/denylist/load.js";
import { denylistRule } from "../../src/rules/denylist/denylist-term.js";
import { trackedDenylist } from "../../src/rules/denylist/tracked-denylist.js";

describe("parseDenylist", () => {
  it("reads one term per line, skipping comments and blank lines", () => {
    expect(parseDenylist("# clients\nInitech\n\n  Globex Corp  \n# done\n")).toEqual([
      "Initech",
      "Globex Corp",
    ]);
  });
});

describe("loadDenylist", () => {
  let dir = "";
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("merges the .leakproof-denylist file and the LEAKPROOF_DENYLIST variable", () => {
    dir = mkdtempSync(join(tmpdir(), "leakproof-"));
    writeFileSync(join(dir, ".leakproof-denylist"), "Initech\n");
    expect(loadDenylist(dir, { LEAKPROOF_DENYLIST: "Globex, initech ,Umbrella" })).toEqual([
      "Initech",
      "Globex",
      "Umbrella",
    ]);
  });

  it("is empty when neither source exists", () => {
    dir = mkdtempSync(join(tmpdir(), "leakproof-"));
    expect(loadDenylist(dir, {})).toEqual([]);
  });
});

describe("denylist/term", () => {
  const rule = denylistRule(["Initech", "Société Générale Test", "intranet.initech.test"]);

  it("finds every occurrence, ignoring case and accents", () => {
    const content = "Built for INITECH.\nSee societe generale test and Initech docs.";
    const matches = rule.find(content);
    expect(matches.map((m) => m.value)).toEqual(["#1", "#2", "#1"]);
    expect(matches.map((m) => m.index)).toEqual([
      content.indexOf("INITECH"),
      content.indexOf("societe"),
      content.indexOf("Initech docs"),
    ]);
  });

  it("only matches whole words", () => {
    expect(rule.find("initechnology and preinitech")).toEqual([]);
  });

  it("matches terms with dots literally", () => {
    const domain = denylistRule(["intranet.corp.test"]);
    expect(domain.find("https://intranet.corp.test/wiki").map((m) => m.value)).toEqual(["#1"]);
    expect(domain.find("intranetXcorpXtest")).toEqual([]);
  });

  it("keeps indexes right after accented characters", () => {
    const content = "Été 2024 : Initech";
    expect(rule.find(content).map((m) => m.index)).toEqual([content.indexOf("Initech")]);
  });

  it("never reveals the term, only its position in the Denylist", () => {
    expect(rule.mask("#2")).toBe("denylist entry #2");
  });

  it("finds nothing with an empty Denylist", () => {
    expect(denylistRule([]).find("anything")).toEqual([]);
  });
});

describe("denylist/tracked-file", () => {
  const settings = { largeFileThreshold: 1 };

  it("flags a Denylist file committed to the repository", () => {
    expect(trackedDenylist.check({ path: ".leakproof-denylist" }, settings)).toBe(
      ".leakproof-denylist",
    );
    expect(trackedDenylist.severity).toBe("critical");
  });

  it("ignores other files", () => {
    expect(trackedDenylist.check({ path: "denylist.md" }, settings)).toBeUndefined();
  });
});
