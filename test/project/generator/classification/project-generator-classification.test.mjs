import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyProjectOperations } from '#src/projector/project-endpoints.mjs';

test('classifyProjectOperations allows json-like, multipart, and empty 2xx bodies', () => {
  const operations = [
    {
      method: 'get',
      path: '/vendor-json',
      requestContentTypes: [],
      successStatus: '200',
      responseContentTypes: ['application/problem+json'],
    },
    {
      method: 'post',
      path: '/uploads',
      requestContentTypes: ['multipart/form-data'],
      successStatus: '201',
      responseContentTypes: ['*/*'],
    },
    {
      method: 'delete',
      path: '/empty',
      requestContentTypes: [],
      successStatus: '204',
      responseContentTypes: [],
    },
    {
      method: 'post',
      path: '/prefers-json',
      requestContentTypes: ['text/plain', 'application/json; charset=utf-8'],
      successStatus: '200',
      responseContentTypes: ['text/csv', 'application/vnd.report+json'],
    },
  ];

  const result = classifyProjectOperations(operations);

  assert.deepEqual(result.supportedOperations, operations);
  assert.deepEqual(result.skippedOperations, []);
});
