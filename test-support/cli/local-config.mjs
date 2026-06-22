import path from 'node:path';

import { writeJsonFile, writeTextFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';

async function withClearedProcessExitCode(callback) {
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;

  try {
    return await callback();
  } finally {
    process.exitCode = previousExitCode;
  }
}

async function withToolLocalConfigs(configs, callback) {
  return withTempDir('openapi-projector-tool-root-', async (toolRoot) => {
    const configPaths = {
      projector: path.join(toolRoot, '.openapi-projector.local.jsonc'),
      legacy: path.join(toolRoot, '.openapi-tool.local.jsonc'),
    };
    const previousCwd = process.cwd();

    for (const [key, localConfigPath] of Object.entries(configPaths)) {
      const config = configs[key] ?? null;
      if (typeof config === 'string') {
        await writeTextFile(localConfigPath, config);
      } else if (config !== null) {
        await writeJsonFile(localConfigPath, config);
      }
    }

    try {
      process.chdir(toolRoot);
      return await callback(configPaths);
    } finally {
      process.chdir(previousCwd);
    }
  });
}

async function withToolLocalConfig(config, callback) {
  return withToolLocalConfigs({ legacy: config }, (paths) => callback(paths.legacy));
}

export {
  withClearedProcessExitCode,
  withToolLocalConfig,
  withToolLocalConfigs,
};
