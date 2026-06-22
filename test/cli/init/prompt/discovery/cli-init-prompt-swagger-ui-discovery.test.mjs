import assert from 'node:assert/strict';
import test from 'node:test';

import { readJson } from '#src/io/files.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { createWritableCapture } from '#test-support/cli/console.mjs';
import { createOpenApiFetchMock, createOpenApiFetchResponse } from '#test-support/cli/fetch.mjs';
import { runInitPrompt } from '#test-support/cli/init-prompt.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { projectConfigPath } from '#test-support/project/paths.mjs';

test(
  'cli init discovers a context-path OpenAPI URL from a Swagger UI URL',
  { concurrency: false },
  async () => {
    const promptOutput = createWritableCapture();
    const swaggerUiUrl = 'https://api.example.com/app/swagger-ui/index.html#/';
    const discoveredUrl = 'https://api.example.com/app/v3/api-docs';
    const fetchMock = createOpenApiFetchMock((url) => {
      if (url === swaggerUiUrl) {
        return createOpenApiFetchResponse({
          body: '<!doctype html><html></html>',
          headers: { 'content-type': 'text/html' },
        });
      }

      if (url === discoveredUrl) {
        return createOpenApiFetchResponse();
      }

      return createOpenApiFetchResponse({ status: 404, statusText: 'Not Found', body: 'not found' });
    });

    await withTempDir('openapi-projector-prompt-context-', async (workspace) => {
      await runInitPrompt({
        fetch: fetchMock,
        input: [`${swaggerUiUrl}\n`],
        stdout: promptOutput.writable,
        targetRoot: workspace,
      });

      const projectConfig = await readJson(projectConfigPath(workspace));

      assert.equal(projectConfig.sourceUrl, discoveredUrl);
      assert.deepEqual(fetchMock.calls.map((call) => call.url), [
        swaggerUiUrl,
        discoveredUrl,
      ]);
      assertMatchesAll(promptOutput.output(), [
        /x GET https:\/\/api\.example\.com\/app\/swagger-ui\/index\.html#\/ - response is not JSON/,
        /✓ GET https:\/\/api\.example\.com\/app\/v3\/api-docs - OpenAPI 3\.0\.3/,
        /Using discovered sourceUrl: https:\/\/api\.example\.com\/app\/v3\/api-docs/,
      ]);
    });
  },
);
