import path from 'node:path';

import { writeJsonFile, writeTextFile } from '#test-support/files/io.mjs';
import {
  projectConfigPath,
  projectReadmePath,
  projectRulesPath,
  projectSummaryPath,
  reviewChangesHistoryDirPath,
} from '#test-support/project/paths.mjs';
import { workspacePath } from '#test-support/cli/workspace.mjs';

async function writeExistingUpdateProjectConfig(workspace) {
  await writeJsonFile(projectConfigPath(workspace), {
    sourceUrl: 'https://existing.example.com/v3/api-docs',
    sourcePath: 'custom/openapi.json',
  });
}

function buildManualUpdateRules({ rulesReviewed, notes, api }) {
  return {
    review: {
      rulesReviewed,
      notes,
    },
    api,
    layout: {
      schemaFileName: 'schema.ts',
    },
  };
}

async function createManualUpdateRulesWorkspace(
  workspace,
  {
    rulesReviewed,
    notes,
    api,
  },
) {
  const rulesPath = projectRulesPath(workspace);

  await writeExistingUpdateProjectConfig(workspace);
  await writeJsonFile(rulesPath, buildManualUpdateRules({ rulesReviewed, notes, api }));

  return {
    projectRulesPath: rulesPath,
  };
}

async function createExistingUpdateWorkspace(workspace) {
  const configPath = projectConfigPath(workspace);
  const readmePath = projectReadmePath(workspace);
  const rulesPath = projectRulesPath(workspace);
  const summaryPath = projectSummaryPath(workspace);
  const historyPath = path.join(reviewChangesHistoryDirPath(workspace), 'old.md');

  await writeExistingUpdateProjectConfig(workspace);
  await writeJsonFile(
    rulesPath,
    buildManualUpdateRules({
      rulesReviewed: true,
      notes: ['manual review kept'],
      api: {
        fetchApiImportPath: '@/custom/api',
        fetchApiSymbol: 'requestClient',
        wrapperGrouping: 'flat',
      },
    }),
  );
  await writeTextFile(readmePath, '# stale guide\n');
  await writeTextFile(workspacePath(workspace, '.gitignore'), 'node_modules\n');
  await writeTextFile(summaryPath, '# generated summary\n');
  await writeTextFile(historyPath, '# old change history\n');

  return {
    historyPath,
    projectConfigPath: configPath,
    projectReadmePath: readmePath,
    projectRulesPath: rulesPath,
    projectSummaryPath: summaryPath,
  };
}

export { createExistingUpdateWorkspace, createManualUpdateRulesWorkspace };
