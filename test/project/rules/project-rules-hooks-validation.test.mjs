import assert from 'node:assert/strict';
import test from 'node:test';

import { validateProjectRules } from '#src/config/validation/project-rules.mjs';

test('validateProjectRules reports invalid React Query hook rules', () => {
  const issues = validateProjectRules({
    hooks: {
      enabled: 'yes',
      library: 'react-query',
      queryMethods: ['GET', 'FETCH'],
      mutationMethods: ['POST', 'GET'],
      queryKeyStrategy: 'constant',
      responseUnwrap: 'body',
      staleTimeImportPath: '@/shared/constant/api',
    },
  });

  assert.deepEqual(
    issues.map((issue) => issue.path),
    [
      'hooks.enabled',
      'hooks.library',
      'hooks.queryMethods[1]',
      'hooks.mutationMethods',
      'hooks.queryKeyStrategy',
      'hooks.responseUnwrap',
      'hooks.staleTimeSymbol',
    ],
  );
});
