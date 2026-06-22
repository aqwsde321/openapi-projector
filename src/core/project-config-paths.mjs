import fs from 'node:fs/promises';
import path from 'node:path';

import { pathExists } from '../io/files.mjs';

const PROJECT_CONFIG_CANDIDATES = [
  'openapi.config.jsonc',
  'openapi/config/project.jsonc',
  'config/project.jsonc',
];

async function findProjectConfigPath(rootDir) {
  for (const candidate of PROJECT_CONFIG_CANDIDATES) {
    const resolved = path.resolve(rootDir, candidate);
    try {
      await fs.access(resolved);
      return resolved;
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return null;
}

async function findExistingProjectConfig(rootDir) {
  for (const [candidateIndex, candidate] of PROJECT_CONFIG_CANDIDATES.entries()) {
    const resolved = path.resolve(rootDir, candidate);
    if (await pathExists(resolved)) {
      return {
        candidate,
        candidateIndex,
        projectConfigPath: resolved,
      };
    }
  }

  return null;
}

export {
  PROJECT_CONFIG_CANDIDATES,
  findExistingProjectConfig,
  findProjectConfigPath,
};
