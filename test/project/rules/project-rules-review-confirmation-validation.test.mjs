import assert from 'node:assert/strict';
import test from 'node:test';

import { validateProjectRules } from '#src/config/validation/project-rules.mjs';

test('validateProjectRules requires runtime helper fields after review confirmation', () => {
  const issues = validateProjectRules({
    review: {
      rulesReviewed: true,
    },
    api: {
      wrapperGrouping: 'tag',
      tagFileCase: 'title',
    },
  });

  assert.deepEqual(
    issues.map((issue) => issue.path),
    [
      'api.fetchApiImportPath',
      'api.fetchApiSymbol',
      'api.fetchApiImportKind',
      'api.adapterStyle',
    ],
  );
});
