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
  'cli init discovers a common OpenAPI path when prompted sourceUrl fails',
  { concurrency: false },
  async () => {
    const promptOutput = createWritableCapture();
    const fetchMock = createOpenApiFetchMock((url) => {
      if (url === 'http://localhost:8080/api-docs') {
        return createOpenApiFetchResponse();
      }

      return createOpenApiFetchResponse({ status: 404, statusText: 'Not Found', body: 'not found' });
    });

    await withTempDir('openapi-projector-prompt-discover-', async (workspace) => {
      await runInitPrompt({
        fetch: fetchMock,
        input: ['http://localhost:8080/v3/api-docs\n'],
        stdout: promptOutput.writable,
        targetRoot: workspace,
      });

      const projectConfig = await readJson(projectConfigPath(workspace));

      assert.equal(projectConfig.sourceUrl, 'http://localhost:8080/api-docs');
      assert.deepEqual(fetchMock.calls.map((call) => call.url), [
        'http://localhost:8080/v3/api-docs',
        'http://localhost:8080/api-docs',
      ]);
      assertMatchesAll(promptOutput.output(), [
        /x GET http:\/\/localhost:8080\/v3\/api-docs - HTTP 404 Not Found/,
        /Trying common OpenAPI paths from http:\/\/localhost:8080/,
        /✓ GET http:\/\/localhost:8080\/api-docs - OpenAPI 3\.0\.3/,
        /Using discovered sourceUrl: http:\/\/localhost:8080\/api-docs/,
      ]);
    });
  },
);
