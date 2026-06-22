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
  createChangedRenamedRequiredNoiseSpec,
  createRenamedRequiredNoiseSpec,
} from '#test-support/catalog/required-noise-fixture.mjs';
import { withWorkspace } from '#test-support/cli/workspace.mjs';

test(
  'catalog suppresses required noise when renamed request schema replaces required fields',
  { concurrency: false },
  async () => {
    const spec = createRenamedRequiredNoiseSpec();

    await withWorkspace({ spec }, async (workspace) => {
      await runCatalog(workspace);

      const nextSpec = createChangedRenamedRequiredNoiseSpec(spec);

      await rerunCatalogWithSpec(workspace, nextSpec);

      const topLevelChanges = await readTopLevelCatalogChanges(workspace);
      const [contractChange] = topLevelChanges.json.contractChanged;

      assertMatchesAll(topLevelChanges.source, [
        /\| 🟢 추가 \| 요청 Body 필드 \| 없음 \| `orderItemId: Long \(required\)` \|/,
        /\| 🔴 삭제 \| 요청 Body 필드 \| `orderItemIdList: List<Long> \(required\)` \| 없음 \|/,
      ]);
      assertDoesNotMatchAny(topLevelChanges.source, [
        /orderItemId: Long \(optional\).*orderItemId: Long \(required\)/,
        /orderItemIdList: List<Long> \(required\).*optional/,
      ]);
      assert.equal(
        contractChange.comparisonTableRows.some((row) => row.next === 'optional'),
        false,
      );
    });
  },
);
