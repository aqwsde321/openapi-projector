import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import { readJson } from '#src/io/files.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { writeJsonFile } from '#test-support/files/io.mjs';
import {
  projectRulesAnalysisJsonPath,
  projectRulesPath,
  readProjectRulesSource,
  runRulesAnalysis,
  writeUsersApiSource,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';
import { writeProjectConfig } from '#test-support/project/config.mjs';

test('rules preserves manual API edits when generated warning scaffold signature no longer matches', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    const analysisJsonPath = projectRulesAnalysisJsonPath(workspace);
    const rulesPath = projectRulesPath(workspace);
    await writeUsersApiSource(workspace, [
      "import apiClient from '@/shared/api-client';",
      '',
      "export const loadUsers = () => apiClient.get('/users');",
      '',
    ]);

    await runRulesAnalysis(workspace);

    const generatedRules = await readJson(rulesPath);
    assert.equal(typeof generatedRules.review.scaffoldSignature, 'string');
    await fs.rm(analysisJsonPath, { force: true });
    await writeJsonFile(rulesPath, {
      ...generatedRules,
      api: {
        ...generatedRules.api,
        fetchApiImportPath: '@/manual/api',
        fetchApiSymbol: 'manualRequest',
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
    ]);
    assertDoesNotMatchAny(rulesSource, [
      /"fetchApiImportPath": "@\/shared\/request"/,
      /"fetchApiSymbol": "request"/,
    ]);
  });
});
