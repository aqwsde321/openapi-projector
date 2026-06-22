import assert from 'node:assert/strict';
import test from 'node:test';

import { validateProjectConfig } from '#src/config/validation/assertions.mjs';

test('validateProjectConfig reports unsafe project-relative paths', () => {
  const issues = validateProjectConfig({
    sourceUrl: 123,
    sourcePath: '../openapi.json',
    catalogJsonPath: '/tmp/endpoints.json',
    generatedSchemaPath: 'openapi/review/generated/schema.ts',
    projectRulesPath: 'openapi/config/project-rules.jsonc',
    projectGeneratedSrcDir: 'openapi/project/src/openapi-generated',
  });

  assert.deepEqual(
    issues.map((issue) => issue.path),
    ['sourceUrl', 'sourcePath', 'catalogJsonPath'],
  );
});
