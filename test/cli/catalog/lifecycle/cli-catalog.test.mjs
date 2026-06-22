import assert from 'node:assert/strict';
import test from 'node:test';

import { catalogCommand } from '#src/commands/catalog.mjs';
import { runInWorkspace, withWorkspace } from '#test-support/cli/workspace.mjs';
import { assertMissing } from '#test-support/files/assertions.mjs';
import { reviewCatalogEndpointsPath } from '#test-support/project/paths.mjs';

test(
  'catalog rejects unsupported OpenAPI versions before writing outputs',
  { concurrency: false },
  async () => {
    const spec = {
      swagger: '2.0',
      info: {
        title: 'Swagger API',
        version: '1.0.0',
      },
      paths: {},
    };

    await withWorkspace({ spec }, async (workspace) => {
      await assert.rejects(
        () => runInWorkspace(workspace, () => catalogCommand.run()),
        /Swagger\/OpenAPI 2\.0 is not supported in MVP v2\./,
      );

      await assertMissing(reviewCatalogEndpointsPath(workspace));
    });
  },
);
