import {
  pathExists,
  writeText,
} from '../io/files.mjs';
import { ensureGitignoreEntry } from './gitignore-entry.mjs';
import {
  PRIMARY_TOOL_LOCAL_CONFIG_FILE_NAME,
  resolvePrimaryToolLocalConfigPath,
} from './tool-local-config-paths.mjs';
import { renderToolLocalConfig } from './tool-local-config-template.mjs';

async function initToolLocalConfig(rootDir) {
  const toolLocalConfigPath = resolvePrimaryToolLocalConfigPath(rootDir);
  let created = false;

  if (!(await pathExists(toolLocalConfigPath))) {
    await writeText(toolLocalConfigPath, renderToolLocalConfig());
    created = true;
  }

  const gitignoreResult = await ensureGitignoreEntry(rootDir, PRIMARY_TOOL_LOCAL_CONFIG_FILE_NAME);

  return {
    toolLocalConfigPath,
    created,
    gitignorePath: gitignoreResult.gitignorePath,
    gitignoreUpdated: gitignoreResult.updated,
  };
}

export { initToolLocalConfig };
