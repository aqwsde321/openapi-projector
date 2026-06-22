import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { generateCommand } from '#src/commands/generate.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { runInWorkspace, withWorkspace } from '#test-support/cli/workspace.mjs';
import { readTextFiles } from '#test-support/files/io.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';
import {
  reviewDocsDirPath,
  reviewGeneratedSchemaPath,
} from '#test-support/project/paths.mjs';

test(
  'generate creates review docs and schema.ts for OpenAPI 3.0',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');

    await withWorkspace({ spec }, async (workspace) => {
      await runInWorkspace(workspace, () => generateCommand.run());

      const schemaPath = reviewGeneratedSchemaPath(workspace);
      const docsDir = reviewDocsDirPath(workspace);
      const docFiles = await fs.readdir(docsDir);
      const [schemaSource, endpointDoc] = await readTextFiles([
        schemaPath,
        path.join(docsDir, 'get-users-by-id.md'),
      ]);

      assertMatchesAll(schemaSource, [/export interface paths/]);
      assert.equal(docFiles.length, 2);
      assertMatchesAll(endpointDoc, [/OperationId: `getUserById`/]);
    });
  },
);
