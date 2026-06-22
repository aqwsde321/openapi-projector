import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildOperationSymbolBase,
  createUniqueName,
  toPascalIdentifier,
} from '#src/projector/naming.mjs';

test('naming helpers strip controller noise, fall back safely, and deduplicate names', () => {
  assert.equal(
    buildOperationSymbolBase({
      operationId: 'AdminUserController_getUserUsingGET',
      endpointId: 'fallback-id',
    }),
    'getUser',
  );
  assert.equal(
    buildOperationSymbolBase({
      operationId: '',
      endpointId: 'get-users-by-id',
    }),
    'getUsersById',
  );
  assert.equal(toPascalIdentifier('getUsersById'), 'GetUsersById');
  assert.equal(toPascalIdentifier(''), 'CallApi');

  const usedNames = new Set(['getUser', 'callApi']);
  assert.equal(createUniqueName('getUser', usedNames), 'getUser2');
  assert.equal(createUniqueName('', usedNames), 'callApi2');
});
