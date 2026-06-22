import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import {
  projectRulesAnalysisJsonPath,
  readProjectRulesSource,
  runRulesAnalysis,
  writeUsersApiSource,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';
import { writeProjectConfig } from '#test-support/project/config.mjs';

test('rules refreshes generated warning scaffold even when previous analysis JSON is missing', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    const analysisJsonPath = projectRulesAnalysisJsonPath(workspace);
    await writeUsersApiSource(workspace, [
      "import apiClient from '@/shared/api-client';",
      '',
      "export const loadUsers = () => apiClient.get('/users');",
      '',
    ]);

    await runRulesAnalysis(workspace);
    await fs.rm(analysisJsonPath, { force: true });

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
      /api-client/,
      /adapterStyle was defaulted to url-config/,
    ]);
  });
});
