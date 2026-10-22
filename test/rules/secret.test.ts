import { describe, expect, it } from "vitest";
import type { ContentRule } from "../../src/rules/content-rule.js";
import { SECRET_RULES } from "../../src/rules/secret/index.js";
import { fake } from "../helpers/fake.js";

function rule(id: string): ContentRule {
  const found = SECRET_RULES.find((r) => r.id === id);
  if (found === undefined) throw new Error(`no rule ${id}`);
  return found;
}

function values(id: string, content: string): string[] {
  return rule(id)
    .find(content)
    .map((match) => match.value);
}

const ZEROS = (n: number) => "0".repeat(n);

describe("secret rules", () => {
  it("have unique ids in the secret category", () => {
    const ids = SECRET_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of SECRET_RULES) expect(r.category).toBe("secret");
  });

  it("report the index of each match", () => {
    const token = fake("gh", "p_", "TESTONLY", ZEROS(28));
    const content = `line one\nconst t = "${token}";\n`;
    const [match] = rule("secret/github-token").find(content);
    expect(match?.index).toBe(content.indexOf(token));
  });
});

/** Each case: rule id, text that must match (and the value it must extract), text that must not. */
const cases: { id: string; positive: [string, string][]; negative: string[] }[] = [
  {
    id: "secret/aws-access-key-id",
    positive: [
      [
        `key = ${fake("AK", "IA", "TESTONLY", "FAKE", "0000")}`,
        fake("AK", "IA", "TESTONLYFAKE0000"),
      ],
    ],
    negative: [
      fake("AK", "IA", "TESTONLY"), // too short
      fake("AK", "IA", "IOSFODNN7", "EXAMPLE"), // AWS documentation example
    ],
  },
  {
    id: "secret/aws-secret-access-key",
    positive: [
      [
        fake("aws_secret_", "access_key = ", "TESTONLY", "a1B2c3D4e5", "F6g7H8i9J0k1L2m3N4o5p6"),
        fake("TESTONLY", "a1B2c3D4e5", "F6g7H8i9J0k1L2m3N4o5p6"),
      ],
    ],
    negative: [fake("aws_secret_", "access_key = ${AWS_SECRET}")],
  },
  {
    id: "secret/github-token",
    positive: [
      [fake("gh", "p_", "TESTONLY", ZEROS(28)), fake("gh", "p_", "TESTONLY", ZEROS(28))],
      [
        fake("github_", "pat_", "TESTONLY", ZEROS(74)),
        fake("github_", "pat_", "TESTONLY", ZEROS(74)),
      ],
    ],
    negative: [fake("gh", "p_", "short"), "ghx_nothing"],
  },
  {
    id: "secret/gitlab-token",
    positive: [
      [fake("gl", "pat-", "TESTONLY", ZEROS(12)), fake("gl", "pat-", "TESTONLY", ZEROS(12))],
    ],
    negative: [fake("gl", "pat-", "short")],
  },
  {
    id: "secret/stripe-live-key",
    positive: [
      [fake("sk", "_live_", "TESTONLY", ZEROS(16)), fake("sk", "_live_", "TESTONLY", ZEROS(16))],
      [fake("rk", "_live_", "TESTONLY", ZEROS(16)), fake("rk", "_live_", "TESTONLY", ZEROS(16))],
    ],
    negative: [
      fake("sk", "_test_", "TESTONLY", ZEROS(16)),
      fake("pk", "_live_", "TESTONLY", ZEROS(16)),
    ],
  },
  {
    id: "secret/openai-key",
    positive: [
      [
        fake("sk-", "proj-", "TESTONLY", ZEROS(12), "T3Blbk", "FJ", "TESTONLY", ZEROS(12)),
        fake("sk-", "proj-", "TESTONLY", ZEROS(12), "T3Blbk", "FJ", "TESTONLY", ZEROS(12)),
      ],
    ],
    negative: [
      fake("sk-", "TESTONLY", ZEROS(40)),
      fake("sk-", "ant-", "api03-", "TESTONLY", ZEROS(40)),
    ],
  },
  {
    id: "secret/anthropic-key",
    positive: [
      [
        fake("sk-", "ant-", "api03-", "TESTONLY", ZEROS(40)),
        fake("sk-", "ant-", "api03-", "TESTONLY", ZEROS(40)),
      ],
    ],
    negative: [fake("sk-", "ant-", "x")],
  },
  {
    id: "secret/slack-token",
    positive: [
      [fake("xo", "xb-", "TESTONLY-0000-0000"), fake("xo", "xb-", "TESTONLY-0000-0000")],
      [
        fake("https://hooks.slack.com/", "services/", "TTESTONLY/", "BTESTONLY/", "TESTONLY0000"),
        fake("https://hooks.slack.com/", "services/", "TTESTONLY/", "BTESTONLY/", "TESTONLY0000"),
      ],
    ],
    negative: ["xoxo hugs", "https://hooks.slack.com/"],
  },
  {
    id: "secret/sendgrid-key",
    positive: [
      [
        fake("SG", ".", "TESTONLY", ZEROS(14), ".", "TESTONLY", ZEROS(35)),
        fake("SG", ".", "TESTONLY", ZEROS(14), ".", "TESTONLY", ZEROS(35)),
      ],
    ],
    negative: ["SG.short.short"],
  },
  {
    id: "secret/npm-token",
    positive: [[fake("np", "m_", "TESTONLY", ZEROS(28)), fake("np", "m_", "TESTONLY", ZEROS(28))]],
    negative: ["npm_config_cache", "npm_package_version"],
  },
  {
    id: "secret/google-api-key",
    positive: [[fake("AI", "za", "TESTONLY", ZEROS(27)), fake("AI", "za", "TESTONLY", ZEROS(27))]],
    negative: [fake("AI", "za", "short")],
  },
  {
    id: "secret/jwt",
    positive: [
      [
        fake(
          "Bearer ",
          "eyJ",
          "hbGciOiJub25lIn0",
          ".",
          "eyJ",
          "zdWIiOiJURVNUIn0",
          ".",
          "TESTONLYsig0",
        ),
        fake("eyJ", "hbGciOiJub25lIn0", ".", "eyJ", "zdWIiOiJURVNUIn0", ".", "TESTONLYsig0"),
      ],
    ],
    negative: ["eyJ.eyJ.x", "header.payload.signature"],
  },
  {
    id: "secret/private-key-block",
    positive: [
      [
        fake("-----BEGIN ", "RSA PRIVATE KEY-----\nTESTONLY\n-----END ", "RSA PRIVATE KEY-----"),
        fake("-----BEGIN ", "RSA PRIVATE KEY-----\nTESTONLY\n-----END ", "RSA PRIVATE KEY-----"),
      ],
      [
        fake(
          "-----BEGIN ",
          "OPENSSH PRIVATE KEY-----\nTESTONLY\n-----END ",
          "OPENSSH PRIVATE KEY-----",
        ),
        fake(
          "-----BEGIN ",
          "OPENSSH PRIVATE KEY-----\nTESTONLY\n-----END ",
          "OPENSSH PRIVATE KEY-----",
        ),
      ],
    ],
    negative: [
      fake("-----BEGIN ", "PUBLIC KEY-----\nAAAA\n-----END ", "PUBLIC KEY-----"),
      fake("-----BEGIN ", "CERTIFICATE-----"),
    ],
  },
  {
    id: "secret/credentials-in-url",
    positive: [
      [fake("postgres://", "app:", "TESTONLYpw42", "@db.example.test:5432/app"), "TESTONLYpw42"],
      [fake("https://", "bot:", "TESTONLY-9fQ", "@git.example.test/repo.git"), "TESTONLY-9fQ"],
    ],
    negative: [
      fake("postgres://", "app:", "${DB_PASSWORD}", "@db.example.test/app"),
      fake("postgres://", "user:", "password", "@localhost/app"),
      fake("https://", "app:", "<password>", "@example.test"),
      "https://example.test/path?a=b:c@d",
      "mailto:someone@example.test",
    ],
  },
  {
    id: "secret/keyword-assignment",
    positive: [
      [fake("DB_PASS", "WORD=", "TESTONLY-x9Qz"), "TESTONLY-x9Qz"],
      [fake("export API_", "KEY=", "TESTONLY7fK2pQ"), "TESTONLY7fK2pQ"],
      [fake('const apiKey = "', "TESTONLY9fQ2zLk", '";'), "TESTONLY9fQ2zLk"],
      [fake('{ "client_sec', 'ret": "', "TESTONLY4mN8vB1", '" }'), "TESTONLY4mN8vB1"],
      [fake("pass", "word: '", "TESTONLYr4Nd0m!", "'"), "TESTONLYr4Nd0m!"],
    ],
    negative: [
      "DB_PASSWORD=${DB_PASSWORD}",
      "password = process.env.DB_PASSWORD",
      "const token = getToken();",
      "token: string;",
      'password: "changeme"',
      'apiKey: "your-api-key"',
      'secret = "short"',
      'token = "aaaaaaaaaaaaaaaa"',
      "PASSWORD_MIN_LENGTH=12",
      'tokenizer = "whitespace-tokenizer"',
    ],
  },
];

for (const { id, positive, negative } of cases) {
  describe(id, () => {
    it.each(positive)("finds the value in %s", (content, expected) => {
      expect(values(id, content)).toEqual([expected]);
    });

    it.each(negative)("ignores %s", (content) => {
      expect(values(id, content)).toEqual([]);
    });
  });
}

describe("masking", () => {
  it("masks provider tokens behind their public prefix", () => {
    const token = fake("gh", "p_", "TESTONLY", ZEROS(28));
    expect(rule("secret/github-token").mask(token)).toBe("ghp_********0000");
  });

  it("shows only the header of a private key block", () => {
    const block = fake(
      "-----BEGIN ",
      "RSA PRIVATE KEY-----\nTESTONLY\n-----END ",
      "RSA PRIVATE KEY-----",
    );
    expect(rule("secret/private-key-block").mask(block)).toBe(
      fake("-----BEGIN ", "RSA PRIVATE KEY-----", "********"),
    );
  });
});
