import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { readJson } from '#src/io/files.mjs';
import {
  runInWorkspace,
  workspacePath,
} from '#test-support/cli/workspace.mjs';
import { assertMissing } from '#test-support/files/assertions.mjs';
import { writeJsonFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { buildProjectConfig } from '#test-support/project/config.mjs';
import { projectConfigPath } from '#test-support/project/paths.mjs';

test(
  'cli init without force refuses to shadow an existing lower-priority config',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-lower-config-', async (workspace) => {
      const lowerPriorityConfigPath = workspacePath(workspace, 'config/project.jsonc');
      const targetConfigPath = projectConfigPath(workspace);
      const lowerPriorityConfigBefore = buildProjectConfig({
        sourceUrl: 'https://old.example.com/v3/api-docs',
      });

      await writeJsonFile(lowerPriorityConfigPath, lowerPriorityConfigBefore);

      await assert.rejects(
        () => runInWorkspace(workspace, () =>
          runCli(['init', '--source-url', 'https://new.example.com/v3/api-docs']),
        ),
        /Project config already exists: .*config\/project\.jsonc\nCreating .*openapi\/config\/project\.jsonc would change which config is used\.\nFor existing workspaces, run npx --yes openapi-projector@latest update\./,
      );

      const lowerPriorityConfig = await readJson(lowerPriorityConfigPath);

      assert.deepEqual(lowerPriorityConfig, lowerPriorityConfigBefore);
      await assertMissing(targetConfigPath);
    });
  },
);
