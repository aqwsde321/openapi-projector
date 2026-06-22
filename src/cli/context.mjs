import path from 'node:path';

import { loadToolLocalConfig } from '../core/project-workspace.mjs';
import { normalizeNonBlankString } from '../core/text-utils.mjs';

function parseCliArgs(argv) {
  const rest = [];
  let projectRoot = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--project-root') {
      projectRoot = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg.startsWith('--project-root=')) {
      projectRoot = arg.slice('--project-root='.length) || null;
      continue;
    }

    rest.push(arg);
  }

  return {
    projectRoot,
    argv: rest,
  };
}

function resolveConfiguredProjectRoot(projectRootValue, configPath) {
  const normalized = normalizeNonBlankString(projectRootValue);
  if (!normalized) {
    return null;
  }

  if (path.isAbsolute(normalized)) {
    return normalized;
  }

  return path.resolve(path.dirname(configPath), normalized);
}

async function buildCliCommandContext(parsed, cwd = process.cwd()) {
  const {
    toolLocalConfigPath,
    toolLocalConfig,
    toolLocalConfigCandidates,
    toolLocalConfigs,
  } =
    await loadToolLocalConfig(cwd);
  const targetRootValue =
    normalizeNonBlankString(parsed.projectRoot) ??
    resolveConfiguredProjectRoot(toolLocalConfig?.projectRoot, toolLocalConfigPath) ??
    cwd;

  return {
    targetRoot: path.resolve(targetRootValue),
    toolLocalConfigPath,
    toolLocalConfig,
    toolLocalConfigCandidates,
    toolLocalConfigs,
  };
}

export {
  buildCliCommandContext,
  parseCliArgs,
};
