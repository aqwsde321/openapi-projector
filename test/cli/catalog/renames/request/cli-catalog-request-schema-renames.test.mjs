import test from 'node:test';

import { catalogCommand } from '#src/commands/catalog.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import {
  readTopLevelCatalogChanges,
  rerunCatalogWithSpec,
} from '#test-support/catalog/commands.mjs';
import {
  createDottedRequestSchemaRenameSpec,
  createRequestSchemaRenameSpec,
} from '#test-support/catalog/request-schema-rename-fixture.mjs';
import { runInWorkspace, withWorkspace } from '#test-support/cli/workspace.mjs';

test(
  'catalog suppresses field noise when request body schema is renamed without shape changes',
  { concurrency: false },
  async () => {
    const spec = createRequestSchemaRenameSpec({ includePayment: true });

    await withWorkspace({ spec }, async (workspace) => {
      await runInWorkspace(workspace, () => catalogCommand.run());

      const nextSpec = createDottedRequestSchemaRenameSpec(spec);

      await rerunCatalogWithSpec(workspace, nextSpec);

      const { source: topLevelChangesSource } =
        await readTopLevelCatalogChanges(workspace);

      assertMatchesAll(topLevelChangesSource, [
        /Body: CreateOrderClaimDto/,
        /Body: PlatformOrderClaimController\.CreateOrderClaimDto/,
      ]);
      assertDoesNotMatchAny(topLevelChangesSource, [
        /required → optional/,
        /optional → required/,
        /🔴 삭제 \| 요청 Body 필드/,
        /🟢 추가 \| 요청 Body 필드/,
        /Map<String, Object> CreateOrderClaimDto/,
      ]);
    });
  },
);
