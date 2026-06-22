import path from 'node:path';

import { writeJsonFile, writeTextFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { buildProjectConfig } from '#test-support/project/config.mjs';
import {
  projectConfigPath,
  projectRulesPath,
  sourceOpenApiPath,
} from '#test-support/project/paths.mjs';

async function writeWorkspaceFiles(workspace, {
  spec,
  rules = null,
  createRulesFile = true,
  extraFiles = [],
  projectConfigOverrides = {},
}) {
  const projectConfig = buildProjectConfig({
    includeProjectRulesAnalysisJsonPath: false,
    overrides: projectConfigOverrides,
  });

  await writeJsonFile(sourceOpenApiPath(workspace), spec);
  await writeJsonFile(projectConfigPath(workspace), projectConfig);

  if (createRulesFile) {
    const projectRules = rules ?? {
      api: {
        fetchApiImportPath: '../../test-support/fetch-api',
        fetchApiSymbol: 'fetchAPI',
        adapterStyle: 'url-config',
        wrapperGrouping: 'tag',
        tagFileCase: 'title',
      },
      layout: {
        schemaFileName: 'schema.ts',
      },
    };

    await writeJsonFile(projectRulesPath(workspace), {
      ...projectRules,
      review: {
        rulesReviewed: true,
        notes: [],
        ...(projectRules.review ?? {}),
      },
      api: {
        fetchApiImportKind: 'named',
        ...(projectRules.api ?? {}),
      },
      layout: {
        schemaFileName: 'schema.ts',
        ...(projectRules.layout ?? {}),
      },
    });
  }

  for (const extraFile of extraFiles) {
    const extraFilePath = workspacePath(workspace, extraFile.path);

    await writeTextFile(extraFilePath, extraFile.content);
  }
}

async function withWorkspace(options, callback) {
  return withTempDir('openapi-tool-', async (workspace) => {
    await writeWorkspaceFiles(workspace, options);
    return await callback(workspace);
  });
}

function workspacePath(workspace, relativePath) {
  return path.join(workspace, relativePath);
}

async function runInWorkspace(workspace, callback) {
  const previousCwd = process.cwd();
  process.chdir(workspace);
  try {
    return await callback();
  } finally {
    process.chdir(previousCwd);
  }
}

export {
  runInWorkspace,
  workspacePath,
  withWorkspace,
};
