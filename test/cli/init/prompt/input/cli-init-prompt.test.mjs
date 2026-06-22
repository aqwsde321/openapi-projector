import assert from 'node:assert/strict';
import test from 'node:test';

import { readJson } from '#src/io/files.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { captureConsoleLog, createWritableCapture } from '#test-support/cli/console.mjs';
import { createOpenApiFetchMock } from '#test-support/cli/fetch.mjs';
import { runInitPrompt } from '#test-support/cli/init-prompt.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { projectConfigPath } from '#test-support/project/paths.mjs';

test(
  'cli init keeps default sourceUrl when interactive prompt is blank',
  { concurrency: false },
  async () => {
    const promptOutput = createWritableCapture();
    const fetchMock = createOpenApiFetchMock();

    await withTempDir('openapi-projector-prompt-default-', async (workspace) => {
      const { output } = await captureConsoleLog(() =>
        runInitPrompt({
          fetch: fetchMock,
          input: ['\n'],
          stdout: promptOutput.writable,
          targetRoot: workspace,
        }),
      );

      const projectConfig = await readJson(projectConfigPath(workspace));
      const promptOutputSource = promptOutput.output();

      assert.equal(projectConfig.sourceUrl, 'http://localhost:8080/v3/api-docs');
      assertMatchesAll(promptOutputSource, [
        /OpenAPI JSON URL \[http:\/\/localhost:8080\/v3\/api-docs\]:/,
        /Checking OpenAPI JSON URL/,
        /✓ GET http:\/\/localhost:8080\/v3\/api-docs - OpenAPI 3\.0\.3/,
      ]);
      assert.deepEqual(fetchMock.calls.map((call) => call.url), [
        'http://localhost:8080/v3/api-docs',
      ]);
      assertMatchesAll(output, [
        /--- sourceUrl config ---/,
        /sourceUrl: http:\/\/localhost:8080\/v3\/api-docs/,
        /edit sourceUrl later: .*openapi[\\/]config[\\/]project\.jsonc \(field: sourceUrl\)/,
        /open: file:.*openapi\/config\/project\.jsonc/,
        /------------------------/,
      ]);
    });
  },
);
