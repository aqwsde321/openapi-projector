import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import { catalogCommand } from '#src/commands/catalog.mjs';
import { readJson } from '#src/io/files.mjs';
import {
  assertDoesNotMatchAny,
} from '#test-support/assertions/text.mjs';
import {
  readTopLevelCatalogChanges,
  rerunCatalogWithSpec,
} from '#test-support/catalog/commands.mjs';
import { runInWorkspace, withWorkspace } from '#test-support/cli/workspace.mjs';
import { writeJsonFile } from '#test-support/files/io.mjs';
import { createSimpleSpec } from '#test-support/fixtures/openapi.mjs';
import {
  reviewCatalogEndpointsPath,
} from '#test-support/project/paths.mjs';

test(
  'catalog ignores legacy raw fingerprint noise without exposing hashes',
  { concurrency: false },
  async () => {
    const spec = createSimpleSpec('Get ping');

    await withWorkspace({ spec }, async (workspace) => {
      await runInWorkspace(workspace, () => catalogCommand.run());

      const catalogPath = reviewCatalogEndpointsPath(workspace);
      const catalog = await readJson(catalogPath);
      await writeJsonFile(catalogPath, {
        ...catalog,
        endpoints: catalog.endpoints.map(({ docFingerprint, docSnapshot, ...endpoint }) => endpoint),
      });

      const nextSpec = structuredClone(spec);
      nextSpec.paths['/ping'].get.responses[200].content[
        'application/json'
      ].schema.properties.ok.description = 'OK flag';

      await rerunCatalogWithSpec(workspace, nextSpec);

      const { json: topLevelChangesJson, source: topLevelChangesSource } =
        await readTopLevelCatalogChanges(workspace);

      assert.equal(topLevelChangesJson.contractChanged.length, 0);
      assert.equal(topLevelChangesJson.docChanged.length, 0);
      assertDoesNotMatchAny(topLevelChangesSource, [
        /\[GET\] `\/ping`/,
        /[a-f0-9]{64} → [a-f0-9]{64}/,
      ]);
    });
  },
);
