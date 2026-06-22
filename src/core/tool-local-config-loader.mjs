import { readJson } from '../io/files.mjs';
import { normalizeNonBlankString } from './text-utils.mjs';
import {
  buildToolLocalConfigCandidates,
} from './tool-local-config-paths.mjs';

async function loadToolLocalConfig(rootDir = process.cwd()) {
  const toolLocalConfigCandidates = buildToolLocalConfigCandidates(rootDir);
  const foundConfigs = [];

  for (const candidatePath of toolLocalConfigCandidates) {
    try {
      const toolLocalConfig = await readJson(candidatePath);
      foundConfigs.push({
        toolLocalConfigPath: candidatePath,
        toolLocalConfig,
      });

      if (normalizeNonBlankString(toolLocalConfig?.projectRoot)) {
        return {
          toolLocalConfigPath: candidatePath,
          toolLocalConfig,
          toolLocalConfigCandidates,
          toolLocalConfigs: foundConfigs,
        };
      }
    } catch (error) {
      if (error?.code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }

  const selectedConfig = foundConfigs[0] ?? null;

  if (selectedConfig) {
    return {
      ...selectedConfig,
      toolLocalConfigCandidates,
      toolLocalConfigs: foundConfigs,
    };
  }

  return {
    toolLocalConfigPath: toolLocalConfigCandidates[0],
    toolLocalConfig: null,
    toolLocalConfigCandidates,
    toolLocalConfigs: [],
  };
}

export { loadToolLocalConfig };
