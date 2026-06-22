import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { writeJsonFile } from '#test-support/files/io.mjs';
import {
  projectRulesPath,
  readProjectRulesSource,
  runRulesAnalysis,
  writeUsersApiSource,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';
import { writeProjectConfig } from '#test-support/project/config.mjs';

test('rules preserves unreviewed manual edits instead of treating them as scaffold', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    const rulesPath = projectRulesPath(workspace);
    await writeUsersApiSource(workspace, [
      "import apiClient from '@/shared/api-client';",
      '',
      "export const loadUsers = () => apiClient('/users', { method: 'GET' });",
      '',
    ]);

    await runRulesAnalysis(workspace);

    await writeJsonFile(rulesPath, {
      review: {
        rulesReviewed: false,
        notes: ['manual edits are pending review'],
      },
      api: {
        fetchApiImportPath: '@/manual/api',
        fetchApiSymbol: 'manualRequest',
        fetchApiImportKind: 'named',
        adapterStyle: 'request-object',
        wrapperGrouping: 'tag',
        tagFileCase: 'kebab',
      },
      layout: {
        schemaFileName: 'schema.ts',
        apiDirName: 'client',
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
      /"fetchApiImportPath": "@\/manual\/api"/,
      /"fetchApiSymbol": "manualRequest"/,
      /"adapterStyle": "request-object"/,
      /"tagFileCase": "kebab"/,
      /manual edits are pending review/,
    ]);
    assertDoesNotMatchAny(rulesSource, [
      /"fetchApiImportPath": "@\/shared\/request"/,
    ]);
  });
});
