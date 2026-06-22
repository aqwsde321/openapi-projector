import assert from 'node:assert/strict';
import test from 'node:test';

import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { writeTextFile } from '#test-support/files/io.mjs';
import {
  ordersApiPath,
  readProjectRulesAnalysis,
  readProjectRulesAnalysisMarkdown,
  readProjectRulesSource,
  runRulesAnalysis,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';
import { writeProjectConfig } from '#test-support/project/config.mjs';

test('rules writes analysis JSON and scaffolds custom request helper defaults', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeTextFile(
      ordersApiPath(workspace),
      [
        "import { request } from '@/shared/request';",
        '',
        'export const createOrder = () => request({ url: \'/orders\', method: \'POST\' });',
        'export const updateOrder = () => request({ url: \'/orders/1\', method: \'PATCH\' });',
        '',
      ].join('\n'),
    );

    await runRulesAnalysis(workspace);

    const analysis = await readProjectRulesAnalysis(workspace);
    const analysisMarkdown = await readProjectRulesAnalysisMarkdown(workspace);
    const rulesSource = await readProjectRulesSource(workspace);

    assert.equal(analysis.files.scanned, 1);
    assert.deepEqual(analysis.apiHelper.value, {
      symbol: 'request',
      importPath: '@/shared/request',
      importKind: 'named',
      callStyle: 'request-object',
    });
    assertMatchesAll(analysisMarkdown, [
      /Analysis JSON: `openapi\/review\/project-rules\/analysis\.json`/,
      /## API helper candidate/,
    ]);
    assertMatchesAll(rulesSource, [
      /"fetchApiImportPath": "@\/shared\/request"/,
      /"fetchApiSymbol": "request"/,
      /"fetchApiImportKind": "named"/,
      /"adapterStyle": "request-object"/,
    ]);
  });
});
