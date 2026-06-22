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
import {
  createChangedRemovedNestedRequiredNoiseSpec,
  createRemovedNestedRequiredNoiseSpec,
} from '#test-support/catalog/required-noise-fixture.mjs';
import { withWorkspace } from '#test-support/cli/workspace.mjs';

test(
  'catalog suppresses required rows for removed nested schemas',
  { concurrency: false },
  async () => {
    const spec = createRemovedNestedRequiredNoiseSpec();

    await withWorkspace({ spec }, async (workspace) => {
      await runCatalog(workspace);

      const nextSpec = createChangedRemovedNestedRequiredNoiseSpec(spec);

      await rerunCatalogWithSpec(workspace, nextSpec);

      const topLevelChanges = await readTopLevelCatalogChanges(workspace);

      assertMatchesAll(topLevelChanges.source, [
        /\| 🔴 삭제 \| 요청 Body 필드 \| `setComponentList: List<SetComponent> \(optional\)` \| 없음 \|/,
      ]);
      assertDoesNotMatchAny(topLevelChanges.source, [
        /refProductId: Long \(required\).*refProductId: Long \(optional\)/,
        /refProductId\.required/,
      ]);
    });
  },
);
