import assert from 'node:assert/strict';
import test from 'node:test';

import { buildTagDirectoryName } from '#src/projector/project-endpoints.mjs';

test('buildTagDirectoryName sanitizes title folders and preserves kebab fallback', () => {
  assert.equal(buildTagDirectoryName('Admin: Reports / v1?.  ', 'title'), 'Admin- Reports - v1-');
  assert.equal(buildTagDirectoryName('...   ', 'title'), 'default');
  assert.equal(buildTagDirectoryName('', 'title'), 'default');
  assert.equal(buildTagDirectoryName('Admin Reports / v1', 'kebab'), 'admin-reports-v1');
});
