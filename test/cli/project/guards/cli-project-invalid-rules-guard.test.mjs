import assert from 'node:assert/strict';
import test from 'node:test';

import { projectCommand } from '#src/commands/project.mjs';
import { runInWorkspace, withWorkspace } from '#test-support/cli/workspace.mjs';
import { assertExists } from '#test-support/files/assertions.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';
import { generatedProjectPath } from '#test-support/project/commands.mjs';

test(
  'project rejects invalid project rules before cleaning generated output',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');

    await withWorkspace(
      {
        spec,
        rules: {
          api: {
            fetchApiImportPath: '../../test-support/fetch-api',
            fetchApiSymbol: 'fetch-api',
            adapterStyle: 'axios',
            wrapperGrouping: 'operation',
            tagFileCase: 'snake',
          },
          layout: {
            schemaFileName: '../schema.ts',
          },
        },
        extraFiles: [
          {
            path: 'openapi/project/src/openapi-generated/keep.ts',
            content: 'export const keep = true;\n',
          },
        ],
      },
      async (workspace) => {
        await assert.rejects(
          () => runInWorkspace(workspace, () => projectCommand.run()),
          /api\.fetchApiSymbol: must be a valid JavaScript identifier.*layout\.schemaFileName: must be a file name, not a path/,
        );

        await assertExists(
          generatedProjectPath(workspace, 'keep.ts'),
        );
      },
    );
  },
);
