import assert from 'node:assert/strict';
import test from 'node:test';

import { renderOperationHookSection } from '#src/generator/write-project-output.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';

test('renderOperationHookSection generates React Query mutation hooks for write methods', () => {
  const rendered = renderOperationHookSection({
    spec: {},
    operation: {
      method: 'patch',
      path: '/profiles/{id}',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['nickname'],
              properties: {
                nickname: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
      requestMediaType: 'application/json',
    },
    functionName: 'updateProfile',
    endpointFileBase: 'update-profile',
    hookRules: {
      enabled: true,
    },
  });

  assert.equal(rendered.hookKind, 'mutation');
  assert.equal(rendered.hookFileBase, 'update-profile.mutation');
  assertMatchesAll(rendered.hookSource, [
    /import \{ useMutation \} from '@tanstack\/react-query';/,
    /const useUpdateProfileMutation = \(\) => \{/,
    /mutationFn: \(params: UpdateProfileRequestDto\) => updateProfile\(params\),/,
    /export \{ useUpdateProfileMutation \};/,
  ]);
});
