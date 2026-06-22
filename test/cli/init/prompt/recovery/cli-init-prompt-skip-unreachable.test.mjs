import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';

import { initCommand } from '#src/commands/init.mjs';
import { readJson } from '#src/io/files.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { createWritableCapture } from '#test-support/cli/console.mjs';
import { createOpenApiFetchMock, createOpenApiFetchResponse } from '#test-support/cli/fetch.mjs';
import { delayedLines } from '#test-support/cli/input.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { projectConfigPath } from '#test-support/project/paths.mjs';

test(
  'cli init can save an unreachable prompted sourceUrl when the user types skip',
  { concurrency: false },
  async () => {
    const promptOutput = createWritableCapture();
    const sourceUrl = 'https://private.example.com/openapi.json';
    const fetchMock = createOpenApiFetchMock(() =>
      createOpenApiFetchResponse({ status: 401, statusText: 'Unauthorized', body: 'auth required' }),
    );

    await withTempDir('openapi-projector-prompt-skip-', async (workspace) => {
      await initCommand.run({
        argv: [],
        context: {
          interactive: true,
          fetch: fetchMock,
          stdin: Readable.from(delayedLines([
            `${sourceUrl}\n`,
            'skip\n',
          ])),
          stdout: promptOutput.writable,
          targetRoot: workspace,
        },
      });

      const projectConfig = await readJson(projectConfigPath(workspace));

      assert.equal(projectConfig.sourceUrl, sourceUrl);
      assertMatchesAll(promptOutput.output(), [
        /x GET https:\/\/private\.example\.com\/openapi\.json - HTTP 401 Unauthorized/,
        /type "skip" to save this URL anyway/,
        /Skipping reachability check\. Saving sourceUrl anyway: https:\/\/private\.example\.com\/openapi\.json/,
      ]);
    });
  },
);
