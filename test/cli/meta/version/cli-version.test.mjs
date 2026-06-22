import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { readJson } from '#src/io/files.mjs';
import { captureConsoleLog } from '#test-support/cli/console.mjs';
import { REPO_ROOT } from '#test-support/cli/paths.mjs';
import {
  runInWorkspace,
  workspacePath,
} from '#test-support/cli/workspace.mjs';
import { writeTextFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';

test(
  'cli prints package version without reading workspace config',
  { concurrency: false },
  async () => {
    const packageJson = await readJson(path.join(REPO_ROOT, 'package.json'));

    await withTempDir('openapi-projector-version-', async (workspace) => {
      await writeTextFile(workspacePath(workspace, '.openapi-projector.local.jsonc'), '{ broken');

      const dashVersion = await captureConsoleLog(() =>
        runInWorkspace(workspace, () => runCli(['--version'])),
      );
      const commandVersion = await captureConsoleLog(() =>
        runInWorkspace(workspace, () => runCli(['version'])),
      );

      assert.equal(dashVersion.output, packageJson.version);
      assert.equal(commandVersion.output, packageJson.version);
    });
  },
);
