import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeProject } from '#src/project-analyzer/analyze-project.mjs';
import {
  writeEntityUserModelSource,
  writeSharedApiRequestSource,
  writeUsersApiSource,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';

test('analyzeProject scans all src sections even when src/entities exists', async () => {
  await withTempProject(async (workspace) => {
    await writeEntityUserModelSource(workspace, 'export interface UserResponse { id: string }\n');
    await writeSharedApiRequestSource(workspace, [
      "export const request = (options: { url: string; method: string }) => options;",
      '',
    ]);
    await writeUsersApiSource(workspace, [
      "import { request } from '@/shared/request';",
      '',
      "export const loadUsers = () => request({ url: '/users', method: 'GET' });",
      '',
    ]);

    const analysis = await analyzeProject(workspace, {
      generatedAt: '2026-04-28T00:00:00.000Z',
    });

    assert.equal(analysis.files.scanned, 3);
    assert.deepEqual(analysis.files.roots, ['src']);
    assert.deepEqual(analysis.files.sections, [
      {
        section: 'src/entities',
        count: 1,
      },
      {
        section: 'src/features',
        count: 1,
      },
      {
        section: 'src/shared',
        count: 1,
      },
    ]);
    assert.equal(analysis.apiHelper.value.importPath, '@/shared/request');
  });
});
