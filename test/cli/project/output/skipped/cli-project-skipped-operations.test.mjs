import assert from 'node:assert/strict';
import test from 'node:test';

import { withWorkspace } from '#test-support/cli/workspace.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';
import { assertMissing } from '#test-support/files/assertions.mjs';
import {
  generatedProjectPath,
  readProjectManifest,
  runGenerateAndProject,
} from '#test-support/project/commands.mjs';

test(
  'project skips operations without explicit 2xx success responses',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    spec.paths['/reports/error-only'] = {
      get: {
        tags: ['Reports'],
        operationId: 'getErrorOnlyReport',
        responses: {
          400: {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    await withWorkspace({ spec }, async (workspace) => {
      await runGenerateAndProject(workspace);

      const manifest = await readProjectManifest(workspace);

      await assertMissing(
        generatedProjectPath(workspace, 'Reports/get-error-only-report.api.ts'),
      );
      assert.equal(manifest.totalEndpoints, 3);
      assert.equal(manifest.generatedEndpoints, 2);
      assert.equal(manifest.skippedEndpoints, 1);
      assert.deepEqual(manifest.skippedOperations, [
        {
          method: 'GET',
          path: '/reports/error-only',
          reasons: ['missing success response'],
        },
      ]);
    });
  },
);
