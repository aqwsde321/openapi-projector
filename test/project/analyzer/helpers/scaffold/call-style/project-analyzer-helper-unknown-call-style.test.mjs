import assert from 'node:assert/strict';
import test from 'node:test';

import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { writeTextFile } from '#test-support/files/io.mjs';
import {
  readProjectRulesAnalysisMarkdown,
  readProjectRulesSource,
  runRulesAnalysis,
  usersApiPath,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';
import { writeProjectConfig } from '#test-support/project/config.mjs';

test('rules records a review note when helper call style is unknown', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeTextFile(
      usersApiPath(workspace),
      [
        "import apiClient from '@/shared/api-client';",
        '',
        "export const loadUsers = () => apiClient.get('/users');",
        '',
      ].join('\n'),
    );

    await runRulesAnalysis(workspace);

    const analysisMarkdown = await readProjectRulesAnalysisMarkdown(workspace);
    const rulesSource = await readProjectRulesSource(workspace);

    assertMatchesAll(analysisMarkdown, [
      /unknown-api-helper-call-style/,
    ]);
    assertMatchesAll(rulesSource, [
      /adapterStyle was defaulted to url-config/,
      /"rulesReviewed": false/,
    ]);
  });
});
