import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { captureConsoleLog } from '#test-support/cli/console.mjs';
import {
  runInWorkspace,
  workspacePath,
} from '#test-support/cli/workspace.mjs';
import { readTextFile, writeTextFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';

test(
  'cli install-skill does not read workspace config',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-skill-config-', async (workspace) => {
      const targetDir = workspacePath(workspace, 'codex-skills/openapi-projector');

      await writeTextFile(workspacePath(workspace, '.openapi-projector.local.jsonc'), '{ broken');

      const { output } = await captureConsoleLog(() =>
        runInWorkspace(workspace, () =>
          runCli(['install-skill', '--target-dir', targetDir, '--yes']),
        ),
      );

      assertMatchesAll(output, [/Installed openapi-projector skill for Codex/]);
      assert.equal(
        await readTextFile(path.join(targetDir, 'SKILL.md')).then((source) =>
          source.includes('name: openapi-projector'),
        ),
        true,
      );
    });
  },
);
