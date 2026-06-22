import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import {
  readProjectRulesSource,
  runRulesAnalysis,
  writeUsersApiSource,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';
import { writeProjectConfig } from '#test-support/project/config.mjs';

test('rules refreshes automatic scaffold even when generated review notes exist', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeUsersApiSource(workspace, [
      "import apiClient from '@/shared/api-client';",
      '',
      "export const loadUsers = () => apiClient.get('/users');",
      '',
    ]);

    await runRulesAnalysis(workspace);

    let rulesSource = await readProjectRulesSource(workspace);
    assertMatchesAll(rulesSource, [
      /adapterStyle was defaulted to url-config/,
      /"fetchApiImportPath": "@\/shared\/api-client"/,
    ]);

    await writeUsersApiSource(workspace, [
      "import { request } from '@/shared/request';",
      '',
      "export const loadUsers = () => request({ url: '/users', method: 'GET' });",
      '',
    ]);

    await runRulesAnalysis(workspace);

    rulesSource = await readProjectRulesSource(workspace);

    assertMatchesAll(rulesSource, [
      /"fetchApiImportPath": "@\/shared\/request"/,
      /"fetchApiSymbol": "request"/,
      /"adapterStyle": "request-object"/,
    ]);
    assertDoesNotMatchAny(rulesSource, [
      /adapterStyle was defaulted to url-config/,
    ]);
  });
});
