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
  'cli init skip saves the best JSON candidate when discovered paths require auth',
  { concurrency: false },
  async () => {
    const promptOutput = createWritableCapture();
    const swaggerUiUrl = 'https://private.example.com/swagger-ui/index.html#/';
    const bestCandidateUrl = 'https://private.example.com/v3/api-docs';
    const fetchMock = createOpenApiFetchMock((url) => {
      if (url === swaggerUiUrl) {
        return createOpenApiFetchResponse({
          body: '<!doctype html><html></html>',
          headers: { 'content-type': 'text/html' },
        });
      }

      return createOpenApiFetchResponse({
        status: 401,
        statusText: 'Unauthorized',
        body: 'auth required',
      });
    });

    await withTempDir('openapi-projector-prompt-auth-skip-', async (workspace) => {
      await runInitPrompt({
        fetch: fetchMock,
        input: delayedLines([
          `${swaggerUiUrl}\n`,
          'skip\n',
        ]),
        stdout: promptOutput.writable,
        targetRoot: workspace,
      });

      const projectConfig = await readJson(projectConfigPath(workspace));

      assert.equal(projectConfig.sourceUrl, bestCandidateUrl);
      assertMatchesAll(promptOutput.output(), [
        /Best OpenAPI JSON URL candidate so far: https:\/\/private\.example\.com\/v3\/api-docs/,
        /Skipping reachability check\. Saving sourceUrl anyway: https:\/\/private\.example\.com\/v3\/api-docs/,
      ]);
    });
  },
);
