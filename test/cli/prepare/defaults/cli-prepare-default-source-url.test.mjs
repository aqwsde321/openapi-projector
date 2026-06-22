import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import {
  createOpenApiFetchMock,
  createOpenApiFetchResponse,
  withGlobalFetch,
} from '#test-support/cli/fetch.mjs';
import { runInWorkspace } from '#test-support/cli/workspace.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';

test(
  'prepare uses default localhost sourceUrl after init',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    const fetchMock = createOpenApiFetchMock(() =>
      createOpenApiFetchResponse({ body: spec }),
    );

    await withGlobalFetch(fetchMock, async () => {
      await withTempDir('openapi-projector-missing-url-', async (workspace) => {
        await runInWorkspace(workspace, async () => {
          await runCli(['init']);
          await assert.rejects(
            () => runCli(['prepare']),
            /Project rules have not been reviewed\./,
          );
        });
      });
    });

    assert.deepEqual(
      fetchMock.calls.map(({ url }) => url),
      ['http://localhost:8080/v3/api-docs'],
    );
  },
);
