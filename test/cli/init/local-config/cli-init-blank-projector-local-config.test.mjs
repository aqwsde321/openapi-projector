import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { withToolLocalConfigs } from '#test-support/cli/local-config.mjs';
import { readTextFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { projectConfigPath } from '#test-support/project/paths.mjs';

test(
  'cli falls back to legacy local config when projector config has blank projectRoot',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-tool-cli-', async (legacyWorkspace) => {
      await withToolLocalConfigs(
        {
          projector: {
            projectRoot: '',
            initDefaults: {
              sourceUrl: 'https://projector.example.com/v3/api-docs',
            },
          },
          legacy: {
            projectRoot: legacyWorkspace,
            initDefaults: {
              sourceUrl: 'https://legacy.example.com/v3/api-docs',
            },
          },
        },
        async () => {
          await runCli(['init']);

          const projectConfigSource = await readTextFile(
            projectConfigPath(legacyWorkspace),
          );

          assertMatchesAll(projectConfigSource, [
            /"sourceUrl": "https:\/\/legacy\.example\.com\/v3\/api-docs"/,
          ]);
        },
      );
    });
  },
);
