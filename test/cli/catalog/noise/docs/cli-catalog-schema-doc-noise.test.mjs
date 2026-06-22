import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertDoesNotMatchAny,
} from '#test-support/assertions/text.mjs';
import {
  readTopLevelCatalogChanges,
  rerunCatalogWithSpec,
  runCatalog,
} from '#test-support/catalog/commands.mjs';
import { createCatalogDocChangeSpec } from '#test-support/catalog/doc-change-fixture.mjs';
import { withWorkspace } from '#test-support/cli/workspace.mjs';

test(
  'catalog ignores referenced schema documentation-only changes',
  { concurrency: false },
  async () => {
    const spec = createCatalogDocChangeSpec({ title: 'Schema Doc Change API' });

    await withWorkspace({ spec }, async (workspace) => {
      await runCatalog(workspace);

      const nextSpec = structuredClone(spec);
      nextSpec.components.schemas.User.properties.name.description = 'Full name';

      await rerunCatalogWithSpec(workspace, nextSpec);

      const topLevelChanges = await readTopLevelCatalogChanges(workspace);

      assert.equal(topLevelChanges.json.contractChanged.length, 0);
      assert.equal(topLevelChanges.json.docChanged.length, 0);
      assertDoesNotMatchAny(topLevelChanges.source, [
        /\[GET\] `\/users\/\{id\}`/,
        /[a-f0-9]{64} → [a-f0-9]{64}/,
      ]);
    });
  },
);
