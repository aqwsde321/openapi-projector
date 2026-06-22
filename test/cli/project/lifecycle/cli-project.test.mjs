import test from 'node:test';

import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { withWorkspace } from '#test-support/cli/workspace.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';
import {
  readGeneratedProjectSource,
  runGenerateAndProject,
} from '#test-support/project/commands.mjs';

test(
  'project expands nested component schemas inside dto files',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    spec.components ??= {};
    spec.components.schemas ??= {};
    spec.components.schemas.NestedLeaf = {
      type: 'object',
      properties: {
        value: {
          type: 'string',
        },
        level: {
          $ref: '#/components/schemas/UserAdminLevel',
        },
      },
    };
    spec.components.schemas.UserAdminLevel = {
      type: 'string',
      enum: ['USER', 'ADMIN'],
    };
    spec.components.schemas.NestedWrapper = {
      type: 'object',
      properties: {
        item: {
          $ref: '#/components/schemas/NestedLeaf',
        },
      },
    };
    spec.paths['/nested'] = {
      get: {
        tags: ['Nested'],
        operationId: 'getNested',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/NestedWrapper',
                },
              },
            },
          },
        },
      },
    };

    await withWorkspace({ spec }, async (workspace) => {
      await runGenerateAndProject(workspace);

      const nestedDtoSource = await readGeneratedProjectSource(
        workspace,
        'Nested/get-nested.dto.ts',
      );

      assertMatchesAll(nestedDtoSource, [
        /export interface NestedLeaf \{/,
        /item\?: NestedLeaf;/,
        /value\?: string;/,
        /level\?: UserAdminLevel;/,
        /export type UserAdminLevel = "USER" \| "ADMIN";/,
        /export interface GetNestedResponseDto \{/,
      ]);
    });
  },
);
