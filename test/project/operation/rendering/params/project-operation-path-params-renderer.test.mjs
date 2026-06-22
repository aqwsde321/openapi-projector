import test from 'node:test';

import { renderOperationSection } from '#src/generator/render-operation-section.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';

test('renderOperationSection aliases non-identifier path parameters before URL encoding', () => {
  const rendered = renderOperationSection({
    spec: {},
    operation: {
      method: 'get',
      path: '/users/{user-id}',
      summary: 'Read user',
      parameters: [
        {
          name: 'user-id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
        },
      ],
      requestBody: null,
      successResponse: {
        description: 'OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
    functionName: 'getUser',
    dtoImportPath: './get-user.dto',
    runtimeFetchImportPath: '@/shared/api',
    runtimeFetchSymbol: 'fetchAPI',
    runtimeCallStyle: 'url-config',
  });

  assertMatchesAll(rendered.dtoSource, [/"user-id": string;/]);
  assertMatchesAll(rendered.apiSource, [
    /const \{ "user-id": userId \} = requestDto;/,
    /\/users\/\$\{encodeURIComponent\(String\(userId\)\)\}/,
  ]);
  assertDoesNotMatchAny(rendered.apiSource, [/requestDto\["user-id"\]/]);
});
