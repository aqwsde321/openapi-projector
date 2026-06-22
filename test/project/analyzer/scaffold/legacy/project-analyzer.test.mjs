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
import { defaultProjectRulesTemplate } from '#test-support/project/analyzer-rules-templates.mjs';

test('rules refreshes untouched init template with analyzed helper defaults', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeTextFile(
      projectRulesPath(workspace),
      defaultProjectRulesTemplate(),
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
      /분석 문서: openapi\/review\/project-rules\/analysis\.md/,
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
