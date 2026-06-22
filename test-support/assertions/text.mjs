import assert from 'node:assert/strict';

function assertMatchesAll(source, patterns) {
  for (const pattern of patterns) {
    assert.match(source, pattern);
  }
}

function assertDoesNotMatchAny(source, patterns) {
  for (const pattern of patterns) {
    assert.doesNotMatch(source, pattern);
  }
}

export { assertDoesNotMatchAny, assertMatchesAll };
