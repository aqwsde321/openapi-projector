import { Readable } from 'node:stream';
import test from 'node:test';

import { initCommand } from '#src/commands/init.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { createWritableCapture } from '#test-support/cli/console.mjs';
import { createOpenApiFetchMock } from '#test-support/cli/fetch.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';

test(
  'cli init colors sourceUrl checks in interactive terminals',
  { concurrency: false },
  async () => {
    const promptOutput = createWritableCapture({ forceColor: true, isTTY: true });

    await withTempDir('openapi-projector-prompt-color-', async (workspace) => {
      await initCommand.run({
        argv: [],
        context: {
          interactive: true,
          fetch: createOpenApiFetchMock(),
          stdin: Readable.from(['https://color.example.com/openapi.json\n']),
          stdout: promptOutput.writable,
          targetRoot: workspace,
        },
      });

      assertMatchesAll(promptOutput.output(), [
        /\x1b\[32m✓\x1b\[0m GET https:\/\/color\.example\.com\/openapi\.json - OpenAPI 3\.0\.3/,
      ]);
    });
  },
);
