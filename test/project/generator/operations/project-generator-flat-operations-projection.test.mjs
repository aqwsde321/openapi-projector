import assert from 'node:assert/strict';
import test from 'node:test';

import { projectOperations } from '#src/projector/project-endpoints.mjs';
import {
  createFlatDedupeOperations,
  summarizeProjectedEndpoints,
} from '#test-support/project/project-operations-fixture.mjs';

test('projectOperations supports flat grouping with global endpoint name dedupe', () => {
  const projection = projectOperations(createFlatDedupeOperations(), {
    wrapperGrouping: 'flat',
  });

  assert.equal(projection.wrapperGrouping, 'flat');
  assert.deepEqual(projection.tagDirectories, []);
  assert.deepEqual(
    summarizeProjectedEndpoints(projection.flatEndpoints),
    [
      {
        tagDirectoryName: null,
        functionName: 'getUser',
        endpointFileBase: 'get-user',
        path: '/users/{id}',
      },
      {
        tagDirectoryName: null,
        functionName: 'getUser2',
        endpointFileBase: 'get-user2',
        path: '/admins/{id}',
      },
    ],
  );
});
