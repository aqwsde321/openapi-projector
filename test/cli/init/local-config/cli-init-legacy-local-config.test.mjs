import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { withToolLocalConfig } from '#test-support/cli/local-config.mjs';
import { readTextFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { projectConfigPath } from '#test-support/project/paths.mjs';

test(
  'cli init still supports legacy tool local config projectRoot and initDefaults',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-tool-cli-', async (workspace) => {
      await withToolLocalConfig(
        {
          projectRoot: workspace,
          initDefaults: {
            sourceUrl: 'https://dev-api.example.com/v3/api-docs',
          },
        },
        async () => {
          await runCli(['init']);

          const projectConfigSource = await readTextFile(
            projectConfigPath(workspace),
          );

          assertMatchesAll(projectConfigSource, [
            /"sourceUrl": "https:\/\/dev-api\.example\.com\/v3\/api-docs"/,
          ]);
        },
      );
    });
  },
);
