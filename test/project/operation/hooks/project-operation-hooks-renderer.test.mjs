import assert from 'node:assert/strict';
import test from 'node:test';

import { renderOperationHookSection } from '#src/generator/write-project-output.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';

test('renderOperationHookSection generates React Query query hooks from hook rules', () => {
  const rendered = renderOperationHookSection({
    spec: {},
    operation: {
      method: 'get',
      path: '/customers',
      parameters: [
        {
          name: 'page',
          in: 'query',
          required: true,
          schema: {
            type: 'integer',
          },
        },
        {
          name: 'membership',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
          },
        },
      ],
      requestBody: null,
    },
    functionName: 'getCustomersList',
    endpointFileBase: 'get-customers-list',
    hookRules: {
      enabled: true,
      queryKeyStrategy: 'path-and-fields',
      responseUnwrap: 'data',
      staleTimeImportPath: '@/shared/constant/api',
      staleTimeSymbol: 'STALE_TIME',
    },
  });

  assert.equal(rendered.hookKind, 'query');
  assert.equal(rendered.hookFileBase, 'get-customers-list.query');
  assertMatchesAll(rendered.hookSource, [
    /import \{ useQuery \} from '@tanstack\/react-query';/,
    /import \{ STALE_TIME \} from '@\/shared\/constant\/api';/,
    /import \{ getCustomersList \} from '\.\/get-customers-list\.api';/,
    /import type \{ GetCustomersListRequestDto \} from '\.\/get-customers-list\.dto';/,
    /const useGetCustomersListQuery = \(params: GetCustomersListRequestDto\) => \{/,
    /queryKey: \["\/customers", params\.page, params\.membership\],/,
    /return response\.data;/,
    /staleTime: STALE_TIME,/,
  ]);
});
