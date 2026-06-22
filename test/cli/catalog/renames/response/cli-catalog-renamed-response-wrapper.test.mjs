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
  'catalog reports nested field changes inside renamed response wrapper schemas',
  { concurrency: false },
  async () => {
    const spec = createResponseSchemaRenameSpec({ idType: 'string' });

    await withWorkspace({ spec }, async (workspace) => {
      await runInWorkspace(workspace, () => catalogCommand.run());

      await rerunCatalogWithSpec(
        workspace,
        createDottedResponseSchemaRenameSpec(spec, { idType: 'integer' }),
      );

      const { source: topLevelChangesSource } =
        await readTopLevelCatalogChanges(workspace);

      assertMatchesAll(topLevelChangesSource, [
        /JsendResponseDtoListClaimListResDto/,
        /JsendResponseDtoListPlatformOrderClaimController\.ClaimListResDto/,
        /id: String/,
        /id: Integer/,
      ]);
      assertDoesNotMatchAny(topLevelChangesSource, [
        /String message;/,
        /data;/,
        /🔴 삭제 \| 응답 Body 필드/,
        /🟢 추가 \| 응답 Body 필드/,
      ]);
    });
  },
);
