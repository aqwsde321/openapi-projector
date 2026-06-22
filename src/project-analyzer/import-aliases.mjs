import path from 'node:path';

import {
  relativePosixPath as relativePath,
} from '../core/path-utils.mjs';
import { readConfigForAliases } from './import-alias-config-reader.mjs';
import {
  appendProjectReferenceConfigs,
  createInitialConfigQueue,
} from './import-alias-config-queue.mjs';
import {
  buildImportAliasMappings,
  sortImportAliasMappings,
} from './import-alias-mappings.mjs';

async function readImportAliasConfig(rootDir) {
  const queue = createInitialConfigQueue(rootDir);
  const seen = new Set();

  for (let index = 0; index < queue.length; index += 1) {
    const configPath = queue[index];
    const normalizedConfigPath = path.resolve(configPath);

    if (seen.has(normalizedConfigPath)) {
      continue;
    }
    seen.add(normalizedConfigPath);

    const configForAliases = readConfigForAliases(normalizedConfigPath);
    if (!configForAliases) {
      continue;
    }

    const mappings = buildImportAliasMappings({
      rootDir,
      baseUrl: configForAliases.baseUrl,
      paths: configForAliases.paths,
    });
    if (mappings.length === 0) {
      appendProjectReferenceConfigs(queue, configForAliases.projectReferences);
      continue;
    }

    return {
      configPath: relativePath(rootDir, normalizedConfigPath),
      mappings: sortImportAliasMappings(mappings),
    };
  }

  return {
    configPath: null,
    mappings: [],
  };
}

export { readImportAliasConfig };
