import assert from 'node:assert/strict';
import test from 'node:test';

import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { writeTextFile } from '#test-support/files/io.mjs';
import {
  readProjectRulesAnalysis,
  readProjectRulesSource,
  runRulesAnalysis,
  usersApiPath,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';
import { writeProjectConfig } from '#test-support/project/config.mjs';

test('rules scaffolds default import helper kind and leaves review unconfirmed', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeTextFile(
      usersApiPath(workspace),
      [
        "import apiClient from '@/shared/api-client';",
        '',
        "export const loadUsers = () => apiClient('/users', { method: 'GET' });",
        '',
      ].join('\n'),
    );

    await runRulesAnalysis(workspace);

    const analysis = await readProjectRulesAnalysis(workspace);
    const rulesSource = await readProjectRulesSource(workspace);

    assert.deepEqual(analysis.apiHelper.value, {
      symbol: 'apiClient',
      importPath: '@/shared/api-client',
      importKind: 'default',
      callStyle: 'url-config',
    });
    assertMatchesAll(rulesSource, [
      /"rulesReviewed": false/,
      /"fetchApiImportPath": "@\/shared\/api-client"/,
      /"fetchApiSymbol": "apiClient"/,
      /"fetchApiImportKind": "default"/,
    ]);
  });
});
