import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { readJson } from '#src/io/files.mjs';
import { createManualUpdateRulesWorkspace } from '#test-support/cli/update-workspace-fixture.mjs';
import { runInWorkspace } from '#test-support/cli/workspace.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { writeUsersApiSource } from '#test-support/project/analyzer-fixture.mjs';

test(
  'cli update avoids mixing analyzed helper identity into partial manual project rules',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-update-', async (workspace) => {
      const { projectRulesPath } = await createManualUpdateRulesWorkspace(workspace, {
        rulesReviewed: true,
        notes: ['manual review kept'],
        api: {
          fetchApiImportPath: '@/custom/api',
        },
      });
      await writeUsersApiSource(workspace, [
        "import { request } from '@/shared/request';",
        '',
        "export const loadUsers = () => request({ url: '/users', method: 'GET' });",
        '',
      ]);

      await runInWorkspace(workspace, () => runCli(['update']));
      const projectRules = await readJson(projectRulesPath);

      assert.equal(projectRules.review.rulesReviewed, true);
      assert.deepEqual(projectRules.review.notes, ['manual review kept']);
      assert.equal(projectRules.api.fetchApiImportPath, '@/custom/api');
      assert.equal(projectRules.api.fetchApiSymbol, 'fetchAPI');
      assert.equal(projectRules.api.fetchApiImportKind, 'named');
      assert.equal(projectRules.api.adapterStyle, 'url-config');
    });
  },
);
