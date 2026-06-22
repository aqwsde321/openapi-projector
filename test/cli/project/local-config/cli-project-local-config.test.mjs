import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { runInWorkspace } from '#test-support/cli/workspace.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';

test(
  'cli reports project config missing in current working directory',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-empty-', async (workspace) => {
      await assert.rejects(
        () => runInWorkspace(workspace, () => runCli(['project'])),
        /Project config not found\./,
      );
    });
  },
);
