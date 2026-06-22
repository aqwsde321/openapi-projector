import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import {
  projectRulesPath,
  readProjectRulesAnalysis,
  readProjectRulesSource,
  runRulesAnalysis,
  writeOrdersApiSource,
  writeProjectRules,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';
import { writeProjectConfig } from '#test-support/project/config.mjs';

test('rules preserves customized project rules while writing analysis outputs', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeProjectRules(workspace, {
      api: {
        fetchApiImportPath: '@/custom/api',
        fetchApiSymbol: 'customFetch',
        adapterStyle: 'url-config',
        wrapperGrouping: 'tag',
        tagFileCase: 'title',
      },
      layout: {
        schemaFileName: 'custom-schema.ts',
      },
    });
    await writeOrdersApiSource(workspace, [
      "import { request } from '@/shared/request';",
      '',
      "export const createOrder = () => request({ url: '/orders', method: 'POST' });",
      '',
    ]);

    await runRulesAnalysis(workspace);

    const analysis = await readProjectRulesAnalysis(workspace);
    const rulesSource = await readProjectRulesSource(workspace);

    assert.deepEqual(analysis.apiHelper.value, {
      symbol: 'request',
      importPath: '@/shared/request',
      importKind: 'named',
      callStyle: 'request-object',
    });
    assertMatchesAll(rulesSource, [
      /"fetchApiImportPath": "@\/custom\/api"/,
      /"fetchApiSymbol": "customFetch"/,
      /"schemaFileName": "custom-schema\.ts"/,
    ]);
    assertDoesNotMatchAny(rulesSource, [
      /"fetchApiImportPath": "@\/shared\/request"/,
    ]);
  });
});
