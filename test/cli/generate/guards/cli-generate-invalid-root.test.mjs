import assert from 'node:assert/strict';
import test from 'node:test';

import { generateCommand } from '#src/commands/generate.mjs';
import { runInWorkspace, withWorkspace } from '#test-support/cli/workspace.mjs';
import { assertMissing } from '#test-support/files/assertions.mjs';
import { reviewGeneratedSchemaPath } from '#test-support/project/paths.mjs';

test(
  'generate rejects malformed OpenAPI root shape before writing outputs',
  { concurrency: false },
  async () => {
    const spec = {
      openapi: '3.0.3',
      info: {
        title: 'Malformed API',
        version: '1.0.0',
      },
      paths: [],
    };

    await withWorkspace({ spec }, async (workspace) => {
      await assert.rejects(
        () => runInWorkspace(workspace, () => generateCommand.run()),
        /OpenAPI source is invalid: paths must be an object\./,
      );

      await assertMissing(reviewGeneratedSchemaPath(workspace));
    });
  },
);
