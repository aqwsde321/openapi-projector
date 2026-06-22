import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertValidProjectConfig } from '../config/validation/assertions.mjs';
import { readJson } from '../io/files.mjs';
import {
  PROJECT_CONFIG_CANDIDATES,
  findExistingProjectConfig,
  findProjectConfigPath,
} from './project-config-paths.mjs';
import { normalizeNonBlankString } from './text-utils.mjs';

const TOOL_ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const DEFAULT_CONFIG_PATH = path.join(TOOL_ROOT_DIR, 'config', 'defaults.jsonc');

function isConfiguredSourceUrl(sourceUrl) {
  const normalizedSourceUrl = normalizeNonBlankString(sourceUrl);
  return Boolean(normalizedSourceUrl && !normalizedSourceUrl.includes('example.com'));
}

async function loadProjectConfig(rootDir) {
  const defaults = await readJson(DEFAULT_CONFIG_PATH);
  const projectConfigPath = await findProjectConfigPath(rootDir);

  if (!projectConfigPath) {
    throw new Error(
      `Project config not found.\nRun npx --yes openapi-projector@latest init first.\nSearched:\n- ${PROJECT_CONFIG_CANDIDATES.join('\n- ')}`,
    );
  }

  const projectConfigOverrides = await readJson(projectConfigPath);
  const projectConfig = {
    ...defaults,
    ...projectConfigOverrides,
  };
  assertValidProjectConfig(projectConfig);

  return {
    defaultConfigPath: DEFAULT_CONFIG_PATH,
    projectConfigPath,
    projectConfig,
    projectConfigOverrides,
  };
}

export {
  PROJECT_CONFIG_CANDIDATES,
  TOOL_ROOT_DIR,
  findExistingProjectConfig,
  isConfiguredSourceUrl,
  loadProjectConfig,
};
