import assert from 'node:assert/strict';
import test from 'node:test';

import { readJson } from '#src/io/files.mjs';
import {
  projectRulesPath,
  runRulesAnalysis,
  writeUsersApiSource,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';
import { writeProjectConfig } from '#test-support/project/config.mjs';

test('rules enables React Query hook scaffold when hook usage is detected', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
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

    assert.equal(rules.hooks.enabled, true);
    assert.equal(rules.hooks.library, '@tanstack/react-query');
    assert.deepEqual(rules.hooks.queryMethods, ['GET']);
    assert.deepEqual(rules.hooks.mutationMethods, ['POST', 'PUT', 'PATCH', 'DELETE']);
  });
});
