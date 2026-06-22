import assert from 'node:assert/strict';
import test from 'node:test';

import { readJson } from '#src/io/files.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { createWritableCapture } from '#test-support/cli/console.mjs';
import { createOpenApiFetchMock, createOpenApiFetchResponse } from '#test-support/cli/fetch.mjs';
import { runInitPrompt } from '#test-support/cli/init-prompt.mjs';
import { delayedLines } from '#test-support/cli/input.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { projectConfigPath } from '#test-support/project/paths.mjs';

test(
  'cli init accepts a discovered JSON path when GET validation times out but HEAD confirms JSON',
  { concurrency: false },
  async () => {
    const promptOutput = createWritableCapture();
    const swaggerUiUrl = 'https://dev-api.example.com/swagger-ui/index.html#/';
    const discoveredUrl = 'https://dev-api.example.com/v3/api-docs';
    const fetchMock = createOpenApiFetchMock((url, options) => {
      const method = options.method ?? 'GET';

      if (url === swaggerUiUrl) {
        return createOpenApiFetchResponse({
          body: '<!doctype html><html></html>',
          headers: { 'content-type': 'text/html' },
        });
      }

      if (url === discoveredUrl && method === 'GET') {
        const error = new Error('request timed out');
        error.name = 'TimeoutError';
        throw error;
      }

      if (url === discoveredUrl && method === 'HEAD') {
        return createOpenApiFetchResponse({
          body: '',
          headers: { 'content-type': 'application/json' },
        });
      }

      return createOpenApiFetchResponse({
        status: 401,
        statusText: 'Unauthorized',
        body: 'auth required',
      });
    });

    await withTempDir('openapi-projector-prompt-head-', async (workspace) => {
      await runInitPrompt({
        fetch: fetchMock,
        input: delayedLines([`${swaggerUiUrl}\n`]),
        stdout: promptOutput.writable,
        targetRoot: workspace,
      });

      const projectConfig = await readJson(projectConfigPath(workspace));

      assert.equal(projectConfig.sourceUrl, discoveredUrl);
      assert.deepEqual(
        fetchMock.calls.map((call) => `${call.options.method ?? 'GET'} ${call.url}`),
        [
          `GET ${swaggerUiUrl}`,
          `GET ${discoveredUrl}`,
          `HEAD ${discoveredUrl}`,
        ],
      );
      assertMatchesAll(promptOutput.output(), [
        /x GET https:\/\/dev-api\.example\.com\/swagger-ui\/index\.html#\/ - response is not JSON/,
        /x GET https:\/\/dev-api\.example\.com\/v3\/api-docs - request timed out after 5000ms/,
        /✓ HEAD https:\/\/dev-api\.example\.com\/v3\/api-docs - JSON endpoint reachable \(GET validation timed out\)/,
        /Using discovered sourceUrl: https:\/\/dev-api\.example\.com\/v3\/api-docs/,
      ]);
      assertDoesNotMatchAny(promptOutput.output(), [
        /Could not find a reachable OpenAPI JSON URL/,
      ]);
    });
  },
);
