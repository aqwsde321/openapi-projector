import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeProject } from '#src/project-analyzer/analyze-project.mjs';
import { writeTextFile } from '#test-support/files/io.mjs';
import { assertAnalysisHasWarning } from '#test-support/project/analyzer-assertions.mjs';
import { usersApiPath } from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';

test('analyzeProject warns when selected helper mixes supported and member call styles', async () => {
  await withTempProject(async (workspace) => {
    await writeTextFile(
      usersApiPath(workspace),
      [
        "import apiClient from '@/shared/api-client';",
        '',
        "export const loadUsers = () => apiClient('/users', { method: 'GET' });",
        "export const loadUser = () => apiClient.get('/users/1');",
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
      callStyle: 'url-config',
    });
    assert.equal(analysis.apiHelper.hasUnknownCallStyle, true);
    assert.deepEqual(analysis.apiHelper.callStyles, [
      {
        value: 'unknown',
        count: 1,
      },
      {
        value: 'url-config',
        count: 1,
      },
    ]);
    assertAnalysisHasWarning(analysis, 'unknown-api-helper-call-style');
  });
});
