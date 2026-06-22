import assert from 'node:assert/strict';
import test from 'node:test';

import { collectProjectOperations } from '#src/openapi/collect-operations.mjs';
import { createCollectProjectOperationsSpec } from '#test-support/fixtures/collect-project-operations-spec.mjs';

test('collectProjectOperations resolves refs and keeps deterministic path/method order', () => {
  const spec = createCollectProjectOperationsSpec();
  const operations = collectProjectOperations(spec);

  assert.deepEqual(
    operations.map((operation) => `${operation.method} ${operation.path}`),
    ['get /alpha/{id}', 'post /alpha/{id}', 'get /zeta'],
  );
  assert.deepEqual(
    operations.map((operation) => operation.endpointId),
    ['get-alpha-by-id', 'post-alpha-by-id', 'get-zeta'],
  );

  const getAlpha = operations[0];
  assert.equal(getAlpha.tag, 'Alpha');
  assert.deepEqual(
    getAlpha.parameters.map((parameter) => `${parameter.in}:${parameter.name}`),
    ['path:id', 'header:x-trace-id'],
  );
  assert.deepEqual(getAlpha.responseContentTypes, ['text/csv', 'application/vnd.alpha+json']);
  assert.equal(getAlpha.responseMediaType, 'application/vnd.alpha+json');
  assert.equal(getAlpha.successStatus, '200');
  assert.equal(getAlpha.successResponse, spec.components.responses.AlphaResponse);

  const postAlpha = operations[1];
  assert.equal(postAlpha.requestBody, spec.components.requestBodies.AlphaBody);
  assert.deepEqual(postAlpha.requestContentTypes, ['text/plain', 'application/json']);
  assert.equal(postAlpha.requestMediaType, 'application/json');

  const fallback = operations[2];
  assert.equal(fallback.tag, 'default');
  assert.deepEqual(fallback.responseContentTypes, []);
  assert.equal(fallback.successStatus, '204');
});
