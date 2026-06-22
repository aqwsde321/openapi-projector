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
  'catalog reports real field changes inside renamed request body schemas',
  { concurrency: false },
  async () => {
    const spec = createRequestSchemaRenameSpec();

    await withWorkspace({ spec }, async (workspace) => {
      await runInWorkspace(workspace, () => catalogCommand.run());

      const nextSpec = createDottedRequestSchemaRenameSpec(spec, {
        required: ['applyClaim', 'orderItemId'],
      });

      await rerunCatalogWithSpec(workspace, nextSpec);

      const { source: topLevelChangesSource } =
        await readTopLevelCatalogChanges(workspace);

      assertMatchesAll(topLevelChangesSource, [
        /Body: CreateOrderClaimDto/,
        /Body: PlatformOrderClaimController\.CreateOrderClaimDto/,
        /reason: String \(required\)/,
        /reason: String \(optional\)/,
      ]);
      assertDoesNotMatchAny(topLevelChangesSource, [
        /optional → required/,
        /🔴 삭제 \| 요청 Body 필드/,
        /🟢 추가 \| 요청 Body 필드/,
        /Map<String, Object> CreateOrderClaimDto/,
      ]);
    });
  },
);
