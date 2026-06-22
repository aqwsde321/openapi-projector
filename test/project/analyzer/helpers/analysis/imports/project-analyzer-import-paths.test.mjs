import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeProject } from '#src/project-analyzer/analyze-project.mjs';
import {
  writeTsConfig,
  writeTsConfigApp,
  writeUsersApiSource,
} from '#test-support/project/analyzer-fixture.mjs';
import { assertApiHelperEvidenceIncludes } from '#test-support/project/analyzer-assertions.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';

test('analyzeProject normalizes relative helper imports with the most specific path alias', async () => {
  await withTempProject(async (workspace) => {
    await writeTsConfig(workspace, {
      files: [],
      references: [
        {
          path: './tsconfig.app.json',
        },
      ],
    });
    await writeTsConfigApp(workspace, {
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@/*': ['src/*'],
          '@shared/*': ['src/shared/*'],
        },
      },
    });
    await writeUsersApiSource(workspace, [
      "import { request } from '../../shared/request';",
      '',
      "export const loadUsers = () => request({ url: '/users', method: 'GET' });",
      '',
    ]);

    const analysis = await analyzeProject(workspace, {
      generatedAt: '2026-04-28T00:00:00.000Z',
    });

    assert.deepEqual(analysis.pathAliases, {
      configPath: 'tsconfig.app.json',
      mappings: [
        {
          aliasPattern: '@shared/*',
          aliasPrefix: '@shared/',
          targetPattern: 'src/shared/*',
          targetPrefix: 'src/shared/',
        },
        {
          aliasPattern: '@/*',
          aliasPrefix: '@/',
          targetPattern: 'src/*',
          targetPrefix: 'src/',
        },
      ],
    });
    assert.deepEqual(analysis.apiHelper.value, {
      symbol: 'request',
      importPath: '@shared/request',
      importKind: 'named',
      callStyle: 'request-object',
    });
    assertApiHelperEvidenceIncludes(analysis, 'normalized from ../../shared/request');
  });
});
