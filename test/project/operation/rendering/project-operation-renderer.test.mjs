import assert from 'node:assert/strict';
import test from 'node:test';

import { renderOperationSection } from '#src/generator/render-operation-section.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import {
  createCollidingUpdateUserOperation,
  createCollidingUpdateUserSpec,
} from '#test-support/project/render-operation-fixture.mjs';

test('renderOperationSection nests request DTOs when path and body fields collide', () => {
  const rendered = renderOperationSection({
    spec: createCollidingUpdateUserSpec(),
    operation: createCollidingUpdateUserOperation(),
    functionName: 'updateUser',
    dtoImportPath: './update-user.dto',
    runtimeFetchImportPath: '@/shared/api',
    runtimeFetchSymbol: 'request',
    runtimeCallStyle: 'request-object',
  });

  assertMatchesAll(rendered.dtoSource, [
    /export interface UpdateUserBody \{/,
    /id\?: string;/,
    /name: string;/,
    /export interface UpdateUserRequestDto \{/,
    /pathParams: \{/,
    /data: UpdateUserBody;/,
  ]);
  assertMatchesAll(rendered.apiSource, [
    /requestDto\.pathParams\["id"\]/,
    /data: requestDto\.data/,
    /await fetchAPI<UpdateUserResponseDto>\(\{/,
  ]);
  assert.deepEqual(rendered.apiImports, [
    "import { request as fetchAPI } from '@/shared/api';",
    "import type { UpdateUserRequestDto, UpdateUserResponseDto } from './update-user.dto';",
  ]);
});
