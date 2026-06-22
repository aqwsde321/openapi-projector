import test from 'node:test';

import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import {
  readProjectRulesAnalysisMarkdown,
  readProjectRulesSource,
  runRulesAnalysis,
  writeOrdersApiSource,
  writeTsConfigSource,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';
import { writeProjectConfig } from '#test-support/project/config.mjs';

test('rules scaffolds normalized alias import paths from relative helper imports', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeTsConfigSource(workspace, [
      '{',
      '  // JSONC path aliases are accepted.',
      '  "compilerOptions": {',
      '    "baseUrl": "src",',
      '    "paths": {',
      '      "@/*": ["*"],',
      '    },',
      '  },',
      '}',
      '',
    ]);
    await writeOrdersApiSource(workspace, [
      "import { request } from '../../shared/request';",
      '',
      "export const createOrder = () => request({ url: '/orders', method: 'POST' });",
      '',
    ]);

    await runRulesAnalysis(workspace);

    const analysisMarkdown = await readProjectRulesAnalysisMarkdown(workspace);
    const rulesSource = await readProjectRulesSource(workspace);

    assertMatchesAll(analysisMarkdown, [/## Path alias mappings/, /`@\/\*` -> `\*`/]);
    assertMatchesAll(rulesSource, [
      /"fetchApiImportPath": "@\/shared\/request"/,
      /"fetchApiSymbol": "request"/,
      /"fetchApiImportKind": "named"/,
    ]);
  });
});
