import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { writeTextFile } from '#test-support/files/io.mjs';
import {
  ordersApiPath,
  projectRulesPath,
  readProjectRulesSource,
  runRulesAnalysis,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';
import { writeProjectConfig } from '#test-support/project/config.mjs';
import { legacyProjectRulesTemplate } from '#test-support/project/analyzer-rules-templates.mjs';

test('rules refreshes legacy untouched scaffold without import kind or review gate', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeTextFile(
      projectRulesPath(workspace),
      legacyProjectRulesTemplate(),
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

    await runRulesAnalysis(workspace);

    const rulesSource = await readProjectRulesSource(workspace);

    assertMatchesAll(rulesSource, [
      /"rulesReviewed": false/,
      /"fetchApiImportPath": "@\/shared\/request"/,
      /"fetchApiSymbol": "request"/,
      /"fetchApiImportKind": "named"/,
      /"adapterStyle": "request-object"/,
    ]);
    assertDoesNotMatchAny(rulesSource, [
      /project-rules template/,
    ]);
  });
});
