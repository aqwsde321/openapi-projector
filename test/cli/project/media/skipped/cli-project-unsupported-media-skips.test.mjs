import assert from 'node:assert/strict';
import test from 'node:test';

import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { withWorkspace } from '#test-support/cli/workspace.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';
import { assertMissing } from '#test-support/files/assertions.mjs';
import {
  generatedProjectPath,
  readProjectManifest,
  readProjectSummary,
  runGenerateAndProject,
} from '#test-support/project/commands.mjs';

test(
  'project skips unsupported non-json success responses and records warnings',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    spec.paths['/reports/export'] = {
      get: {
        tags: ['Reports'],
        operationId: 'exportReport',
        responses: {
          200: {
            description: 'OK',
            content: {
              'text/csv': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    };

    await withWorkspace({ spec }, async (workspace) => {
      await runGenerateAndProject(workspace);

      const summarySource = await readProjectSummary(workspace);
      const manifest = await readProjectManifest(workspace);

      await assertMissing(
        generatedProjectPath(workspace, 'Reports/export-report.api.ts'),
      );
      assert.equal(manifest.totalEndpoints, 3);
      assert.equal(manifest.generatedEndpoints, 2);
      assert.equal(manifest.skippedEndpoints, 1);
      assert.deepEqual(manifest.skippedOperations, [
        {
          method: 'GET',
          path: '/reports/export',
          reasons: ['response media type text/csv'],
        },
      ]);
      assertMatchesAll(summarySource, [
        /## Skipped Operations/,
        /`GET \/reports\/export`: response media type text\/csv/,
      ]);
    });
  },
);
