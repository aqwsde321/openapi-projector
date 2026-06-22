import assert from 'node:assert/strict';
import test from 'node:test';

import { readJson } from '#src/io/files.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { writeJsonFile } from '#test-support/files/io.mjs';
import {
  projectRulesAnalysisJsonPath,
  readProjectRulesSource,
  runRulesAnalysis,
  writeUsersApiSource,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';
import { writeProjectConfig } from '#test-support/project/config.mjs';

test('rules refreshes signed scaffold when previous analysis JSON is stale', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    const analysisJsonPath = projectRulesAnalysisJsonPath(workspace);
    await writeUsersApiSource(workspace, [
      "import apiClient from '@/shared/api-client';",
      '',
      "export const loadUsers = () => apiClient('/users', { method: 'GET' });",
      '',
    ]);

    await runRulesAnalysis(workspace);

    const staleAnalysis = await readJson(analysisJsonPath);
    await writeJsonFile(analysisJsonPath, {
      ...staleAnalysis,
      apiHelper: {
        ...staleAnalysis.apiHelper,
        value: {
          symbol: 'staleRequest',
          importPath: '@/stale/request',
          importKind: 'named',
          callStyle: 'request-object',
        },
      },
      warnings: [],
      legacy: {
        fetchApiImportStats: [],
      },
    });

    await writeUsersApiSource(workspace, [
      "import { request } from '@/shared/request';",
      '',
      "export const loadUsers = () => request({ url: '/users', method: 'GET' });",
      '',
    ]);

    await runRulesAnalysis(workspace);

    const rulesSource = await readProjectRulesSource(workspace);
    assertMatchesAll(rulesSource, [
      /"fetchApiImportPath": "@\/shared\/request"/,
      /"fetchApiSymbol": "request"/,
      /"adapterStyle": "request-object"/,
    ]);
    assertDoesNotMatchAny(rulesSource, [
      /"fetchApiImportPath": "@\/shared\/api-client"/,
      /"fetchApiImportPath": "@\/stale\/request"/,
    ]);
  });
});
