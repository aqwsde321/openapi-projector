import assert from 'node:assert/strict';
import test from 'node:test';

import { renderOperationSection } from '#src/generator/render-operation-section.mjs';

test('renderOperationSection can import default runtime helpers', () => {
  const rendered = renderOperationSection({
    spec: {},
    operation: {
      method: 'get',
      path: '/health',
      summary: 'Health',
      parameters: [],
      successResponse: {
        description: 'OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: {
                  type: 'boolean',
                },
              },
            },
          },
        },
      },
    },
    functionName: 'getHealth',
    dtoImportPath: './get-health.dto',
    runtimeFetchImportPath: '@/shared/api-client',
    runtimeFetchSymbol: 'apiClient',
    runtimeFetchImportKind: 'default',
    runtimeCallStyle: 'url-config',
  });

  assert.deepEqual(rendered.apiImports, [
    "import fetchAPI from '@/shared/api-client';",
    "import type { GetHealthResponseDto } from './get-health.dto';",
  ]);
});
