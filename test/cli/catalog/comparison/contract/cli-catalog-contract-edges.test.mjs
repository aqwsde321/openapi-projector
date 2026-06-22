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
  'catalog omits wildcard media type labels in the contract comparison preview',
  { concurrency: false },
  async () => {
    const spec = {
      openapi: '3.0.3',
      info: {
        title: 'Wildcard API',
        version: '1.0.0',
      },
      paths: {
        '/wild': {
          get: {
            summary: 'Wildcard response',
            responses: {
              200: {
                description: 'OK',
                content: {
                  '*/*': {
                    schema: {
                      $ref: '#/components/schemas/WildResponse',
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          WildResponse: {
            type: 'object',
            properties: {
              value: {
                type: 'string',
              },
            },
          },
        },
      },
    };

    await withWorkspace({ spec }, async (workspace) => {
      await runCatalog(workspace);

      const nextSpec = structuredClone(spec);
      nextSpec.components.schemas.WildResponse.properties.value = {
        type: 'integer',
        format: 'int32',
      };

      await rerunCatalogWithSpec(workspace, nextSpec);

      const topLevelChanges = await readTopLevelCatalogChanges(workspace);

      assertMatchesAll(topLevelChanges.source, [/- 200: WildResponse/]);
      assertDoesNotMatchAny(topLevelChanges.source, [/200 \*\/\*/, /200 \/:/]);
    });
  },
);
