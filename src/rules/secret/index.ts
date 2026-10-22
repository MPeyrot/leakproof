import type { ContentRule } from "../content-rule.js";
import { awsAccessKeyId, awsSecretAccessKey } from "./aws.js";
import { credentialsInUrl } from "./credentials-in-url.js";
import { githubToken, gitlabToken } from "./git-hosting.js";
import { keywordAssignment } from "./keyword-assignment.js";
import { sendgridKey, slackToken } from "./messaging.js";
import { npmToken } from "./npm-token.js";
import { anthropicKey, openaiKey, stripeLiveKey } from "./payments-and-ai.js";
import { privateKeyBlock } from "./private-key-block.js";
import { googleApiKey, jwt } from "./public-by-design.js";

export const SECRET_RULES: readonly ContentRule[] = [
  privateKeyBlock,
  awsAccessKeyId,
  awsSecretAccessKey,
  githubToken,
  gitlabToken,
  stripeLiveKey,
  openaiKey,
  anthropicKey,
  slackToken,
  sendgridKey,
  npmToken,
  googleApiKey,
  jwt,
  credentialsInUrl,
  keywordAssignment,
];
