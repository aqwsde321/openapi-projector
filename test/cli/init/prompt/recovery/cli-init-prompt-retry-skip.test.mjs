import assert from 'node:assert/strict';
import test from 'node:test';

import { readJson } from '#src/io/files.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { createWritableCapture } from '#test-support/cli/console.mjs';
import { createOpenApiFetchMock, createOpenApiFetchResponse } from '#test-support/cli/fetch.mjs';
import { runInitPrompt } from '#test-support/cli/init-prompt.mjs';
import { delayedLines } from '#test-support/cli/input.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { projectConfigPath } from '#test-support/project/paths.mjs';

test(
  'cli init asks again when prompted sourceUrl checks fail',
  { concurrency: false },
  async () => {
    const promptOutput = createWritableCapture();
    const fetchMock = createOpenApiFetchMock((url) => {
      if (url === 'https://good.example.com/openapi.json') {
        return createOpenApiFetchResponse();
      }

      return createOpenApiFetchResponse({ status: 404, statusText: 'Not Found', body: 'not found' });
    });

    await withTempDir('openapi-projector-prompt-retry-', async (workspace) => {
      await runInitPrompt({
        fetch: fetchMock,
        input: delayedLines([
          'https://bad.example.com/openapi.json\n',
          'https://good.example.com/openapi.json\n',
        ]),
        stdout: promptOutput.writable,
        targetRoot: workspace,
      });

      const projectConfig = await readJson(projectConfigPath(workspace));

      assert.equal(projectConfig.sourceUrl, 'https://good.example.com/openapi.json');
      assertMatchesAll(promptOutput.output(), [
        /Could not find a reachable OpenAPI JSON URL/,
        /x GET https:\/\/bad\.example\.com\/openapi\.json - HTTP 404 Not Found/,
        /✓ GET https:\/\/good\.example\.com\/openapi\.json - OpenAPI 3\.0\.3/,
      ]);
    });
  },
);
