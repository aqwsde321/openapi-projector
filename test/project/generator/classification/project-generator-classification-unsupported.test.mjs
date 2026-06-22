import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyProjectOperations } from '#src/projector/project-endpoints.mjs';

test('classifyProjectOperations records every unsupported reason on boundary inputs', () => {
  const operations = [
    {
      method: 'post',
      path: '/multi-request',
      requestContentTypes: ['text/plain', 'application/xml'],
      successStatus: '200',
      responseContentTypes: ['application/json'],
    },
    {
      method: 'put',
      path: '/plain-request',
      requestContentTypes: ['text/plain'],
      successStatus: null,
      responseContentTypes: ['text/csv'],
    },
    {
      method: 'get',
      path: '/multi-response',
      requestContentTypes: [],
      successStatus: '200',
      responseContentTypes: ['text/csv', 'application/pdf'],
    },
  ];

  assert.deepEqual(classifyProjectOperations(operations), {
    supportedOperations: [],
    skippedOperations: [
      {
        method: 'POST',
        path: '/multi-request',
        reasons: ['request media types text/plain, application/xml'],
      },
      {
        method: 'PUT',
        path: '/plain-request',
        reasons: [
          'request media type text/plain',
          'missing success response',
          'response media type text/csv',
        ],
      },
      {
        method: 'GET',
        path: '/multi-response',
        reasons: ['response media types text/csv, application/pdf'],
      },
    ],
  });
});
