import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeProject } from '#src/project-analyzer/analyze-project.mjs';
import { writeTextFile } from '#test-support/files/io.mjs';
import { assertAnalysisHasWarning } from '#test-support/project/analyzer-assertions.mjs';
import {
  ordersApiPath,
  usersApiPath,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';

test('analyzeProject derives call style from the selected helper only', async () => {
  await withTempProject(async (workspace) => {
    await writeTextFile(
      usersApiPath(workspace),
      [
        "import apiClient from '@/shared/api-client';",
        '',
        "export const loadUsers = () => apiClient.get('/users');",
        "export const createUser = () => apiClient.post('/users');",
        '',
      ].join('\n'),
    );
    await writeTextFile(
      ordersApiPath(workspace),
      [
        "import { request } from '@/shared/request';",
        '',
        "export const createOrder = () => request({ url: '/orders', method: 'POST' });",
        '',
      ].join('\n'),
    );

    const analysis = await analyzeProject(workspace, {
      generatedAt: '2026-04-28T00:00:00.000Z',
    });

    assert.deepEqual(analysis.apiHelper.value, {
      symbol: 'apiClient',
      importPath: '@/shared/api-client',
      importKind: 'default',
      callStyle: 'unknown',
    });
    assertAnalysisHasWarning(analysis, 'unknown-api-helper-call-style');
  });
});
