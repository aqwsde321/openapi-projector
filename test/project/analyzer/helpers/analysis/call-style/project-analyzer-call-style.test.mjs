import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeProject } from '#src/project-analyzer/analyze-project.mjs';
import { writeTextFile } from '#test-support/files/io.mjs';
import { assertApiHelperEvidenceExcludes } from '#test-support/project/analyzer-assertions.mjs';
import { usersApiPath } from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';

test('analyzeProject ignores unrelated imported function calls when selecting helper', async () => {
  await withTempProject(async (workspace) => {
    await writeTextFile(
      usersApiPath(workspace),
      [
        "import { useQuery } from '@tanstack/react-query';",
        "import { clsx } from 'clsx';",
        "import { request } from '@/shared/request';",
        '',
        'export const buildClassName = () => {',
        "  clsx('one');",
        "  clsx('two');",
        "  clsx('three');",
        "  clsx('four');",
        "  return clsx('five');",
        '};',
        '',
        'export const useUsers = () =>',
        '  useQuery({',
        "    queryKey: ['users'],",
        "    queryFn: () => request({ url: '/users', method: 'GET' }),",
        '  });',
        '',
      ].join('\n'),
    );

    const analysis = await analyzeProject(workspace, {
      generatedAt: '2026-04-28T00:00:00.000Z',
    });

    assert.deepEqual(analysis.apiHelper.value, {
      symbol: 'request',
      importPath: '@/shared/request',
      importKind: 'named',
      callStyle: 'request-object',
    });
    assert.equal(analysis.apiLayer.value.usesReactQuery, true);
    assertApiHelperEvidenceExcludes(analysis, 'clsx');
  });
});
