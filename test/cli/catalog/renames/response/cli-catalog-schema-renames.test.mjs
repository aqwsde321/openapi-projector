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
  createDottedResponseSchemaRenameSpec,
  createResponseSchemaRenameSpec,
} from '#test-support/catalog/response-schema-rename-fixture.mjs';
import { runInWorkspace, withWorkspace } from '#test-support/cli/workspace.mjs';

test(
  'catalog renders dotted schema names without broken declarations or endpoint ids',
  { concurrency: false },
  async () => {
    const spec = createResponseSchemaRenameSpec({ idType: 'integer' });

    await withWorkspace({ spec }, async (workspace) => {
      await runInWorkspace(workspace, () => catalogCommand.run());

      await rerunCatalogWithSpec(
        workspace,
        createDottedResponseSchemaRenameSpec(spec, { idType: 'integer' }),
      );

      const { source: topLevelChangesSource } =
        await readTopLevelCatalogChanges(workspace);

      assertMatchesAll(topLevelChangesSource, [
        /- \[GET\] `\/platform\/orders\/claims` - 클레임 내역 목록 조회/,
        /JsendResponseDtoListClaimListResDto/,
        /JsendResponseDtoListPlatformOrderClaimController\.ClaimListResDto/,
      ]);
      assertDoesNotMatchAny(topLevelChangesSource, [
        /`get-platform-orders-claims` \[GET\]/,
        /"\];/,
        /Map<String, Object> .*Dto;/,
        /응답 Body 필드/,
        /data;/,
        /String message;/,
      ]);
    });
  },
);
