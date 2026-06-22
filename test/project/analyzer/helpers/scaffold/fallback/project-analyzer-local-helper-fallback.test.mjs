import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { writeTextFile } from '#test-support/files/io.mjs';
import {
  readProjectRulesAnalysis,
  readProjectRulesSource,
  runRulesAnalysis,
  usersApiPath,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';
import { writeProjectConfig } from '#test-support/project/config.mjs';

test('rules does not mix local helper symbols with imported fallback paths', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeTextFile(
      usersApiPath(workspace),
      [
        "import { fetchAPI } from '@/shared/http';",
        '',
        'function request(url, config) {',
        '  return Promise.resolve({ url, config });',
        '}',
        '',
        "export const loadUsers = () => request('/users', { method: 'GET' });",
        "export const loadUser = () => request('/users/1', { method: 'GET' });",
        '',
      ].join('\n'),
    );

    await runRulesAnalysis(workspace);

    const analysis = await readProjectRulesAnalysis(workspace);
    const rulesSource = await readProjectRulesSource(workspace);

    assert.equal(analysis.apiHelper.value.importPath, '<local>');
    assert.equal(analysis.apiHelper.value.symbol, 'request');
    assertMatchesAll(rulesSource, [
      /"fetchApiImportPath": "@\/shared\/http"/,
      /"fetchApiSymbol": "fetchAPI"/,
    ]);
    assertDoesNotMatchAny(rulesSource, [
      /"fetchApiSymbol": "request"/,
    ]);
  });
});
