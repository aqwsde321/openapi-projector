import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';

import { initCommand } from '#src/commands/init.mjs';
import { readJson } from '#src/io/files.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { createWritableCapture } from '#test-support/cli/console.mjs';
import { createOpenApiFetchMock } from '#test-support/cli/fetch.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { projectConfigPath } from '#test-support/project/paths.mjs';

test(
  'cli init prompts for sourceUrl in interactive terminals',
  { concurrency: false },
  async () => {
    const sourceUrl = 'https://prompt.example.com/v3/api-docs';
    const promptOutput = createWritableCapture();
    const fetchMock = createOpenApiFetchMock();

    await withTempDir('openapi-projector-prompt-', async (workspace) => {
      await initCommand.run({
        argv: [],
        context: {
          interactive: true,
          fetch: fetchMock,
          stdin: Readable.from([`${sourceUrl}\n`]),
          stdout: promptOutput.writable,
          targetRoot: workspace,
        },
      });

      const projectConfig = await readJson(projectConfigPath(workspace));

      assert.equal(projectConfig.sourceUrl, sourceUrl);
      assertMatchesAll(promptOutput.output(), [
        /Default sourceUrl: http:\/\/localhost:8080\/v3\/api-docs/,
        /OpenAPI JSON URL \[http:\/\/localhost:8080\/v3\/api-docs\]:/,
        /✓ GET https:\/\/prompt\.example\.com\/v3\/api-docs - OpenAPI 3\.0\.3/,
      ]);
      assert.deepEqual(fetchMock.calls.map((call) => call.url), [sourceUrl]);
    });
  },
);
