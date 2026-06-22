import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { readJson } from '#src/io/files.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { captureConsoleLog } from '#test-support/cli/console.mjs';
import { createManualUpdateRulesWorkspace } from '#test-support/cli/update-workspace-fixture.mjs';
import { runInWorkspace } from '#test-support/cli/workspace.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { writeUsersApiSource } from '#test-support/project/analyzer-fixture.mjs';

test(
  'cli update preserves unreviewed project rules while adding defaults',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-update-', async (workspace) => {
      const { projectRulesPath } = await createManualUpdateRulesWorkspace(workspace, {
        rulesReviewed: false,
        notes: ['manual review pending'],
        api: {
          fetchApiImportPath: '@/custom/api',
          fetchApiSymbol: 'requestClient',
        },
      });
      await writeUsersApiSource(workspace, [
        "import { request } from '@/shared/request';",
        '',
        "export const loadUsers = () => request({ url: '/users', method: 'GET' });",
        '',
      ]);

      const { output } = await captureConsoleLog(() =>
        runInWorkspace(workspace, () => runCli(['update'])),
      );
      const projectRules = await readJson(projectRulesPath);

      assert.equal(projectRules.review.rulesReviewed, false);
      assert.deepEqual(projectRules.review.notes, ['manual review pending']);
      assert.equal(projectRules.api.fetchApiImportPath, '@/custom/api');
      assert.equal(projectRules.api.fetchApiSymbol, 'requestClient');
      assert.equal(projectRules.api.fetchApiImportKind, 'named');
      assert.equal(projectRules.api.adapterStyle, 'url-config');
      assert.equal(projectRules.api.wrapperGrouping, 'tag');
      assert.equal(projectRules.api.tagFileCase, 'title');
      assert.equal(projectRules.hooks.enabled, false);
      assertMatchesAll(output, [
        /Migrated project rules defaults/,
        /added api\.fetchApiImportKind: "named"/,
        /added api\.adapterStyle: "url-config"/,
      ]);
      assertDoesNotMatchAny(output, [/updated review\.rulesReviewed/]);
    });
  },
);
