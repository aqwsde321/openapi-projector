import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { readJson } from '#src/io/files.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { captureConsoleLog } from '#test-support/cli/console.mjs';
import { runInWorkspace } from '#test-support/cli/workspace.mjs';
import { readTextFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { projectConfigPath } from '#test-support/project/paths.mjs';

test(
  'cli init applies --source-url override to project config and output',
  { concurrency: false },
  async () => {
    const sourceUrl = 'https://api.example.com/v3/api-docs';

    await withTempDir('openapi-projector-source-url-', async (workspace) => {
      const { output } = await captureConsoleLog(() =>
        runInWorkspace(workspace, () => runCli(['init', '--source-url', sourceUrl])),
      );

      const configPath = projectConfigPath(workspace);
      const projectConfigSource = await readTextFile(configPath);
      const projectConfig = await readJson(configPath);

      assert.equal(projectConfig.sourceUrl, sourceUrl);
      assertMatchesAll(projectConfigSource, [
        /"sourceUrl": "https:\/\/api\.example\.com\/v3\/api-docs"/,
      ]);
      assertDoesNotMatchAny(projectConfigSource, [
        /"sourceUrl": "http:\/\/localhost:8080\/v3\/api-docs"/,
      ]);
      assertMatchesAll(output, [
        /sourceUrl: https:\/\/api\.example\.com\/v3\/api-docs/,
        /edit sourceUrl later: .*openapi[\\/]config[\\/]project\.jsonc \(field: sourceUrl\)/,
      ]);
    });
  },
);
