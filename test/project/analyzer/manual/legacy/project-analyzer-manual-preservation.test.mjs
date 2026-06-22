import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { writeTextFile } from '#test-support/files/io.mjs';
import {
  projectRulesAnalysisJsonPath,
  projectRulesPath,
  readProjectRulesSource,
  runRulesAnalysis,
  usersApiPath,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';
import { writeProjectConfig } from '#test-support/project/config.mjs';

test('rules preserves legacy generated warning scaffold without signature', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    const apiFilePath = usersApiPath(workspace);
    const analysisJsonPath = projectRulesAnalysisJsonPath(workspace);
    const rulesPath = projectRulesPath(workspace);
    await writeTextFile(
      apiFilePath,
      [
        "import apiClient from '@/shared/api-client';",
        '',
        "export const loadUsers = () => apiClient.get('/users');",
        '',
      ].join('\n'),
    );

    await runRulesAnalysis(workspace);

    const signedRulesSource = await readProjectRulesSource(workspace);
    await writeTextFile(
      rulesPath,
      signedRulesSource.replace(/\n    "scaffoldSignature": "[^"]+",/, ''),
    );
    await fs.rm(analysisJsonPath, { force: true });

    await writeTextFile(
      apiFilePath,
      [
        "import { request } from '@/shared/request';",
        '',
        "export const loadUsers = () => request({ url: '/users', method: 'GET' });",
        '',
      ].join('\n'),
    );

    await runRulesAnalysis(workspace);

    const rulesSource = await readProjectRulesSource(workspace);
    assertMatchesAll(rulesSource, [
      /"fetchApiImportPath": "@\/shared\/api-client"/,
      /"fetchApiSymbol": "apiClient"/,
      /adapterStyle was defaulted to url-config/,
    ]);
    assertDoesNotMatchAny(rulesSource, [
      /"fetchApiImportPath": "@\/shared\/request"/,
      /"fetchApiSymbol": "request"/,
    ]);
  });
});
