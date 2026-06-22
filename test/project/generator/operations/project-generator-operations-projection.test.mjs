import assert from 'node:assert/strict';
import test from 'node:test';

import { projectOperations } from '#src/projector/project-endpoints.mjs';
import {
  createTagDirectoryDedupeOperations,
  summarizeProjectedEndpoints,
} from '#test-support/project/project-operations-fixture.mjs';

test('projectOperations builds deterministic tag directories and endpoint file names', () => {
  const projection = projectOperations(createTagDirectoryDedupeOperations(), {
    tagFileCase: 'kebab',
  });

  assert.equal(projection.totalEndpoints, 3);
  assert.equal(projection.generatedEndpoints, 2);
  assert.deepEqual(projection.skippedOperations, [
    {
      method: 'GET',
      path: '/reports/export',
      reasons: ['response media type text/csv'],
    },
  ]);
  assert.deepEqual(
    projection.tagDirectories.map((tagDirectory) => tagDirectory.tagDirectoryName),
    ['user-admin'],
  );
  assert.deepEqual(
    summarizeProjectedEndpoints(projection.tagDirectories[0].endpoints),
    [
      {
        tagDirectoryName: 'user-admin',
        functionName: 'getUser',
        endpointFileBase: 'get-user',
        path: '/users/{id}',
      },
      {
        tagDirectoryName: 'user-admin',
        functionName: 'getUser2',
        endpointFileBase: 'get-user2',
        path: '/users/{id}/copy',
      },
    ],
  );
});
