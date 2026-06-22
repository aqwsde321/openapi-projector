import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { runInWorkspace } from '#test-support/cli/workspace.mjs';
import { readTextFile, writeTextFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { projectReadmePath } from '#test-support/project/paths.mjs';

test(
  'cli upgrade-docs fails before init',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-upgrade-docs-missing-', async (workspace) => {
      const readmePath = projectReadmePath(workspace);

      await writeTextFile(readmePath, '# unrelated guide\n');

      await assert.rejects(
        () => runInWorkspace(workspace, () => runCli(['upgrade-docs'])),
        /OpenAPI workspace not found\.\nRun npx --yes openapi-projector@latest init before upgrading generated docs\./,
      );

      const projectReadmeSource = await readTextFile(readmePath);
      assert.equal(projectReadmeSource, '# unrelated guide\n');
    });
  },
);
