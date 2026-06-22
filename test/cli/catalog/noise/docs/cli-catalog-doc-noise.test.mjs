import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import {
  readTopLevelCatalogChanges,
  rerunCatalogWithSpec,
  runCatalog,
} from '#test-support/catalog/commands.mjs';
import { createCatalogDocChangeSpec } from '#test-support/catalog/doc-change-fixture.mjs';
import { withWorkspace } from '#test-support/cli/workspace.mjs';

test(
  'catalog renders doc-only snapshot changes without exposing raw fingerprints',
  { concurrency: false },
  async () => {
    const spec = createCatalogDocChangeSpec();

    await withWorkspace({ spec }, async (workspace) => {
      await runCatalog(workspace);

      const nextSpec = structuredClone(spec);
      nextSpec.paths['/users/{id}'].get.responses[200].description = 'Success';
      nextSpec.components.schemas.User.properties.name.description = 'Full name';

      await rerunCatalogWithSpec(workspace, nextSpec);

      const topLevelChanges = await readTopLevelCatalogChanges(workspace);

      assert.equal(topLevelChanges.json.contractChanged.length, 0);
      assert.equal(topLevelChanges.json.docChanged.length, 1);
      assertMatchesAll(topLevelChanges.source, [
        /🟡 응답 200 설명 변경: OK → Success/,
      ]);
      assertDoesNotMatchAny(topLevelChanges.source, [
        /Schema User\.name 설명 변경/,
        /[a-f0-9]{64} → [a-f0-9]{64}/,
      ]);
    });
  },
);
