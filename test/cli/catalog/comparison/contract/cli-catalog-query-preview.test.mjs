import assert from 'node:assert/strict';
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
import { runInWorkspace, withWorkspace } from '#test-support/cli/workspace.mjs';
import { createSimpleSpec } from '#test-support/fixtures/openapi.mjs';

test(
  'catalog highlights first added query parameter in the contract comparison preview',
  { concurrency: false },
  async () => {
    const spec = createSimpleSpec('Get inquiry detail');

    await withWorkspace({ spec }, async (workspace) => {
      await runInWorkspace(workspace, () => catalogCommand.run());

      const nextSpec = structuredClone(spec);
      nextSpec.paths['/ping'].get.parameters = [
        {
          name: 'abbb',
          in: 'query',
          required: true,
          schema: {
            type: 'integer',
            format: 'int32',
          },
        },
      ];

      await rerunCatalogWithSpec(workspace, nextSpec);

      const { json: topLevelChangesJson, source: topLevelChangesSource } =
        await readTopLevelCatalogChanges(workspace);

      assertMatchesAll(topLevelChangesSource, [
        /\| 🟢 추가 \| 요청 Query 파라미터 \| 없음 \| `abbb: Integer \(required\)` \|/,
        /<details>/,
      ]);
      assertDoesNotMatchAny(topLevelChangesSource, [
        /<br>/,
        /operation\.parameters` \| `\[\]`/,
        /Compatibility Check/,
      ]);
      assert.equal(topLevelChangesJson.externalDiff, undefined);
    });
  },
);
