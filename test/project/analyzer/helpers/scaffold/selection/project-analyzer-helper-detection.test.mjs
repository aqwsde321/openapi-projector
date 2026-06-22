import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { writeTextFile } from '#test-support/files/io.mjs';
import {
  ordersApiPath,
  readProjectRulesSource,
  runRulesAnalysis,
  usersApiPath,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';
import { writeProjectConfig } from '#test-support/project/config.mjs';

test('rules scaffolds import path, symbol, and kind from the same helper candidate', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeTextFile(
      usersApiPath(workspace),
      [
        "import { fetchAPI } from '@/shared/http';",
        '',
        "export const fetchUser = () => fetchAPI('/users', { method: 'GET' });",
        '',
      ].join('\n'),
    );
    await writeTextFile(
      ordersApiPath(workspace),
      [
        "import { request } from '@/shared/request';",
        '',
        "export const createOrder = () => request({ url: '/orders', method: 'POST' });",
        "export const updateOrder = () => request({ url: '/orders/1', method: 'PATCH' });",
        '',
      ].join('\n'),
    );

    await runRulesAnalysis(workspace);

    const rulesSource = await readProjectRulesSource(workspace);

    assertMatchesAll(rulesSource, [
      /"fetchApiImportPath": "@\/shared\/request"/,
      /"fetchApiSymbol": "request"/,
      /"fetchApiImportKind": "named"/,
      /"adapterStyle": "request-object"/,
    ]);
    assertDoesNotMatchAny(rulesSource, [
      /"fetchApiImportPath": "@\/shared\/http"/,
    ]);
  });
});
