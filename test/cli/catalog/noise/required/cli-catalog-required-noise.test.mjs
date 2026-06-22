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
  createChangedRequiredNoiseSpec,
  createRequiredNoiseSpec,
} from '#test-support/catalog/required-noise-fixture.mjs';
import { withWorkspace } from '#test-support/cli/workspace.mjs';

test(
  'catalog ignores response body required-only noise for unchanged detail endpoints',
  { concurrency: false },
  async () => {
    const spec = createRequiredNoiseSpec();

    await withWorkspace({ spec }, async (workspace) => {
      await runCatalog(workspace);

      await rerunCatalogWithSpec(workspace, createChangedRequiredNoiseSpec(spec));

      const topLevelChanges = await readTopLevelCatalogChanges(workspace);
      const changedEndpoints = topLevelChanges.json.contractChanged
        .map((item) => `${item.method} ${item.path}`)
        .sort();

      assert.deepEqual(changedEndpoints, [
        'post /bos/notifications/case-settings',
        'put /bos/notifications/case-settings',
      ]);
      assertMatchesAll(topLevelChanges.source, [
        /\| 🟡 변경 \| 요청 Body 필드 \| `channel: String \(optional, enum: SMS, ALIMTALK, EMAIL\)` \| `channel: String \(required, enum: SMS, ALIMTALK, EMAIL\)` \|/,
      ]);
      assertDoesNotMatchAny(topLevelChanges.source, [
        /\[GET\] `\/bos\/notifications\/case-settings\/detail`/,
        /응답 Body 필드.*channel.*required/,
      ]);
    });
  },
);
