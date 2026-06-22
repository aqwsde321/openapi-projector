import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { readJson } from '#src/io/files.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { captureConsoleLog } from '#test-support/cli/console.mjs';
import {
  runInWorkspace,
  workspacePath,
} from '#test-support/cli/workspace.mjs';
import { writeJsonFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { buildProjectConfig } from '#test-support/project/config.mjs';
import { projectConfigPath } from '#test-support/project/paths.mjs';

test(
  'cli init force keeps target config preferred when lower-priority config also exists',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-mixed-config-', async (workspace) => {
      const targetConfigPath = projectConfigPath(workspace);
      const lowerPriorityConfigPath = workspacePath(workspace, 'config/project.jsonc');
      const sourceUrl = 'https://new.example.com/v3/api-docs';

      await writeJsonFile(targetConfigPath, buildProjectConfig({
        sourceUrl: 'https://target.example.com/v3/api-docs',
      }));
      await writeJsonFile(lowerPriorityConfigPath, buildProjectConfig({
        sourceUrl: 'https://lower.example.com/v3/api-docs',
      }));

      const { output } = await captureConsoleLog(() =>
        runInWorkspace(workspace, () =>
          runCli(['init', '--force', '--source-url', sourceUrl]),
        ),
      );

      const targetConfig = await readJson(targetConfigPath);
      const lowerPriorityConfig = await readJson(lowerPriorityConfigPath);

      assert.equal(targetConfig.sourceUrl, sourceUrl);
      assert.equal(lowerPriorityConfig.sourceUrl, 'https://lower.example.com/v3/api-docs');
      assertMatchesAll(output, [/sourceUrl: https:\/\/new\.example\.com\/v3\/api-docs/]);
    });
  },
);
