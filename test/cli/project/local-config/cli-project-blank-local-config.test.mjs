import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import {
  runInWorkspace,
  workspacePath,
} from '#test-support/cli/workspace.mjs';
import { writeJsonFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';

test(
  'cli uses current working directory when local config projectRoot is blank',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-blank-local-', async (workspace) => {
      await writeJsonFile(
        workspacePath(workspace, '.openapi-projector.local.jsonc'),
        { projectRoot: '', initDefaults: { sourceUrl: '' } },
      );

      await runInWorkspace(workspace, async () => {
        await assert.rejects(
          () => runCli(['project']),
          /Project config not found\./,
        );
      });
    });
  },
);
