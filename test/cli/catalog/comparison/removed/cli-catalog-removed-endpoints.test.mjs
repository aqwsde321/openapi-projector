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
import { withWorkspace } from '#test-support/cli/workspace.mjs';

test(
  'catalog omits Swagger UI links for removed endpoints',
  { concurrency: false },
  async () => {
    const spec = {
      openapi: '3.0.3',
      info: {
        title: 'Removed API',
        version: '1.0.0',
      },
      paths: {
        '/orders/{id}': {
          delete: {
            tags: ['Orders'],
            operationId: 'deleteOrder',
            summary: '주문 삭제',
            responses: {
              204: {
                description: 'No Content',
              },
            },
          },
        },
        '/ping': {
          get: {
            summary: 'Ping',
            responses: {
              200: {
                description: 'OK',
              },
            },
          },
        },
      },
    };

    await withWorkspace(
      {
        spec,
        projectConfigOverrides: {
          sourceUrl: 'https://dev-api.pharmaresearch.com/v3/api-docs',
        },
      },
      async (workspace) => {
        await runCatalog(workspace);

        const nextSpec = structuredClone(spec);
        delete nextSpec.paths['/orders/{id}'];

        await rerunCatalogWithSpec(workspace, nextSpec);

        const topLevelChanges = await readTopLevelCatalogChanges(workspace);

        assertMatchesAll(topLevelChanges.source, [
          /## 🗑️ Removed\n\n- ~~\[DELETE\] `\/orders\/\{id\}` - 주문 삭제~~/,
        ]);
        assertDoesNotMatchAny(topLevelChanges.source, [/deleteOrder/]);
      },
    );
  },
);
