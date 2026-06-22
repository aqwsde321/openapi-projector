import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { readJson } from '#src/io/files.mjs';
import {
  runInWorkspace,
  workspacePath,
} from '#test-support/cli/workspace.mjs';
import { readTextFiles, writeTextFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { projectConfigPath } from '#test-support/project/paths.mjs';

test(
  'cli init without force fails on target config when lower-priority config also exists',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-mixed-config-no-force-', async (workspace) => {
      const targetConfigPath = projectConfigPath(workspace);
      const lowerPriorityConfigPath = workspacePath(workspace, 'config/project.jsonc');
      const targetConfigSourceBefore = `{
  // target config should remain byte-for-byte on init failure
  "sourceUrl": "https://target.example.com/v3/api-docs",
  "sourcePath": "openapi/_internal/source/openapi.json",
  "outputs": {
    "reviewDir": "custom/review",
  },
}
`;
      const lowerPriorityConfigSourceBefore = `{
  // lower-priority config should also remain untouched
  "sourceUrl": "https://lower.example.com/v3/api-docs",
  "sourcePath": "custom/lower/openapi.json",
  "outputs": {
    "reviewDir": "lower/review",
  },
}
`;
      const targetConfigBefore = {
        sourceUrl: 'https://target.example.com/v3/api-docs',
        sourcePath: 'openapi/_internal/source/openapi.json',
        outputs: {
          reviewDir: 'custom/review',
        },
      };
      const lowerPriorityConfigBefore = {
        sourceUrl: 'https://lower.example.com/v3/api-docs',
        sourcePath: 'custom/lower/openapi.json',
        outputs: {
          reviewDir: 'lower/review',
        },
      };

      await writeTextFile(targetConfigPath, targetConfigSourceBefore);
      await writeTextFile(lowerPriorityConfigPath, lowerPriorityConfigSourceBefore);

      await assert.rejects(
        () => runInWorkspace(workspace, () =>
          runCli(['init', '--source-url', 'https://new.example.com/v3/api-docs']),
        ),
        /Project config already exists: .*openapi\/config\/project\.jsonc\nFor existing workspaces, run npx --yes openapi-projector@latest update\.\nUse init --force only to reset bootstrap files\./,
      );

      const targetConfig = await readJson(targetConfigPath);
      const lowerPriorityConfig = await readJson(lowerPriorityConfigPath);
      const [
        targetConfigSource,
        lowerPriorityConfigSource,
      ] = await readTextFiles([
        targetConfigPath,
        lowerPriorityConfigPath,
      ]);

      assert.deepEqual(targetConfig, targetConfigBefore);
      assert.deepEqual(lowerPriorityConfig, lowerPriorityConfigBefore);
      assert.equal(targetConfigSource, targetConfigSourceBefore);
      assert.equal(lowerPriorityConfigSource, lowerPriorityConfigSourceBefore);
    });
  },
);
