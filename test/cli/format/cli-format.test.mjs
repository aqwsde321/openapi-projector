import assert from 'node:assert/strict';
import test from 'node:test';

import { formatFailure, formatSuccess } from '#src/cli/format.mjs';

test('cli status formatter uses colored marks when color is enabled', () => {
  const colorStream = { forceColor: true };

  assert.equal(formatSuccess('done', colorStream), '\x1b[32m✓\x1b[0m done');
  assert.equal(formatFailure('failed', colorStream), '\x1b[31mx\x1b[0m failed');
  assert.equal(formatSuccess('done', {}), '✓ done');
  assert.equal(formatFailure('failed', {}), 'x failed');
});
