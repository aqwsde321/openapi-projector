import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import {
  withClearedProcessExitCode,
  withToolLocalConfigs,
} from '#test-support/cli/local-config.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { jsonDataUrl, readFixtureJson } from '#test-support/fixtures/json.mjs';

test(
  'doctor allows fresh target when initDefaults sourceUrl can seed prepare',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    const sourceUrl = jsonDataUrl(spec);

    await withClearedProcessExitCode(async () => {
      await withTempDir('openapi-projector-doctor-', async (workspace) => {
        await withToolLocalConfigs(
          {
            projector: {
              projectRoot: workspace,
              initDefaults: {
                sourceUrl,
              },
            },
          },
          async () => {
            await runCli(['doctor']);
            assert.equal(process.exitCode, undefined);
          },
        );
      });
    });
  },
);
