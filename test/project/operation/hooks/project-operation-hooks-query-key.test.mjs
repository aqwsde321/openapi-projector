import test from 'node:test';

import { renderOperationHookSection } from '#src/generator/write-project-output.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';

test('renderOperationHookSection uses flattened object query parameter fields in query keys', () => {
  const rendered = renderOperationHookSection({
    spec: {
      components: {
        schemas: {
          PageRequest: {
            type: 'object',
            properties: {
              page: {
                type: 'integer',
              },
            },
          },
          PaymentListFilter: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
              },
            },
          },
        },
      },
    },
    operation: {
      method: 'get',
      path: '/payments',
      parameters: [
        {
          name: 'pageable',
          in: 'query',
          schema: {
            $ref: '#/components/schemas/PageRequest',
          },
        },
        {
          name: 'condition',
          in: 'query',
          schema: {
            $ref: '#/components/schemas/PaymentListFilter',
          },
        },
      ],
      requestBody: null,
    },
    functionName: 'getPaymentList',
    endpointFileBase: 'get-payment-list',
    hookRules: {
      enabled: true,
      queryKeyStrategy: 'path-and-fields',
    },
  });

  assertMatchesAll(rendered.hookSource, [
    /const useGetPaymentListQuery = \(params: GetPaymentListRequestDto\) => \{/,
    /queryKey: \["\/payments", params\.page, params\.status\],/,
  ]);
});
