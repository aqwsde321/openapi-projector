import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { withToolLocalConfigs } from '#test-support/cli/local-config.mjs';
import { assertExists } from '#test-support/files/assertions.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { projectConfigPath } from '#test-support/project/paths.mjs';

test(
  'cli ignores invalid legacy local config when projector config has projectRoot',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-cli-', async (workspace) => {
      await withToolLocalConfigs(
        {
          projector: {
            projectRoot: workspace,
            initDefaults: {
              sourceUrl: 'https://projector.example.com/v3/api-docs',
            },
          },
          legacy: '{ broken json',
        },
        async () => {
          await runCli(['init']);
          await assertExists(projectConfigPath(workspace));
        },
      );
    });
  },
);
