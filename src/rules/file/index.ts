import { backup } from "./backup.js";
import { committedDependencies } from "./committed-dependencies.js";
import { credentialsFile } from "./credentials-file.js";
import { databaseDump } from "./database-dump.js";
import { dockerConfig } from "./docker-config.js";
import { envFile } from "./env-file.js";
import type { FileRule } from "./file-rule.js";
import { gitCredentials } from "./git-credentials.js";
import { largeFile } from "./large-file.js";
import { osMetadata } from "./os-metadata.js";
import { privateKey } from "./private-key.js";
import { registryToken } from "./registry-token.js";
import { terraformState } from "./terraform-state.js";

export const FILE_RULES: readonly FileRule[] = [
  envFile,
  privateKey,
  gitCredentials,
  terraformState,
  credentialsFile,
  registryToken,
  dockerConfig,
  databaseDump,
  backup,
  osMetadata,
  committedDependencies,
  largeFile,
];
