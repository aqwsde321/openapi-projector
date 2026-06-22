import assert from 'node:assert/strict';
import test from 'node:test';

import { readJson } from '#src/io/files.mjs';
import {
  projectRulesPath,
  runRulesAnalysis,
  writeProjectRules,
  writeUsersApiSource,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';
import { writeProjectConfig } from '#test-support/project/config.mjs';

test('rules preserves explicit hook disable while filling missing hook defaults', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeProjectRules(workspace, {
      api: {
        fetchApiImportPath: '@/custom/api',
        fetchApiSymbol: 'customFetch',
        fetchApiImportKind: 'named',
        adapterStyle: 'url-config',
        wrapperGrouping: 'tag',
        tagFileCase: 'title',
      },
      hooks: {
        enabled: false,
      },
      layout: {
        schemaFileName: 'schema.ts',
      },
    });
    await writeUsersApiSource(workspace, [
      "import { useQuery } from '@tanstack/react-query';",
      "import { request } from '@/shared/request';",
      '',
      'export const useUsersQuery = () =>',
      '  useQuery({',
      "    queryKey: ['users'],",
      "    queryFn: () => request({ url: '/users', method: 'GET' }),",
      '  });',
      '',
    ]);

    await runRulesAnalysis(workspace);

    const rules = await readJson(projectRulesPath(workspace));

    assert.equal(rules.hooks.enabled, false);
    assert.equal(rules.hooks.library, '@tanstack/react-query');
    assert.deepEqual(rules.hooks.queryMethods, ['GET']);
    assert.deepEqual(rules.hooks.mutationMethods, ['POST', 'PUT', 'PATCH', 'DELETE']);
  });
});
