import assert from 'node:assert/strict';
import test from 'node:test';

import { validateProjectRules } from '#src/config/validation/project-rules.mjs';

test('validateProjectRules reports unsupported and unsafe boundary values', () => {
  const issues = validateProjectRules({
    api: {
      fetchApiImportPath: '',
      fetchApiSymbol: 'fetch-api',
      fetchApiImportKind: 'namespace',
      adapterStyle: 'axios',
      wrapperGrouping: 'operation',
      tagFileCase: 'snake',
    },
    layout: {
      schemaFileName: '../schema.ts',
    },
  });

  assert.deepEqual(
    issues.map((issue) => issue.path),
    [
      'api.fetchApiImportPath',
      'api.fetchApiSymbol',
      'api.fetchApiImportKind',
      'api.adapterStyle',
      'api.wrapperGrouping',
      'api.tagFileCase',
      'layout.schemaFileName',
    ],
  );
});
