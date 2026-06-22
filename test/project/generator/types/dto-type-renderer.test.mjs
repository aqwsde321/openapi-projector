import assert from 'node:assert/strict';
import test from 'node:test';

import { createTypeRenderer } from '#src/generator/dto/source-renderer.mjs';

test('type renderer preserves OpenAPI 3.1 nullable union types', () => {
  const renderer = createTypeRenderer((name) => name);

  assert.equal(
    renderer.renderType({
      type: ['string', 'null'],
    }),
    'string | null',
  );
  assert.equal(
    renderer.renderType({
      type: 'array',
      items: {
        type: ['string', 'null'],
      },
    }),
    '(string | null)[]',
  );
});
