import test from 'node:test';

import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { withWorkspace } from '#test-support/cli/workspace.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';
import {
  readGeneratedProjectSource,
  runGenerateAndProject,
} from '#test-support/project/commands.mjs';

test(
  'project strips controller prefixes from operationId-based names',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    spec.paths['/admin/corporate-members/{userId}'] = {
      get: {
        tags: ['Admin'],
        operationId: 'AdminCorporateController_getAdminCorporateMember',
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    row: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    await withWorkspace({ spec }, async (workspace) => {
      await runGenerateAndProject(workspace);

      const dtoSource = await readGeneratedProjectSource(
        workspace,
        'Admin/get-admin-corporate-member.dto.ts',
      );
      const apiSource = await readGeneratedProjectSource(
        workspace,
        'Admin/get-admin-corporate-member.api.ts',
      );

      assertMatchesAll(dtoSource, [
        /export interface GetAdminCorporateMemberRequestDto \{/,
        /export interface GetAdminCorporateMemberResponseDto \{/,
      ]);
      assertMatchesAll(apiSource, [
        /export const getAdminCorporateMember = async/,
        /const \{ userId \} = requestDto;/,
        /\/admin\/corporate-members\/\$\{encodeURIComponent\(String\(userId\)\)\}/,
      ]);
      assertDoesNotMatchAny(dtoSource, [/AdminCorporateControllerGetAdminCorporateMember/]);
      assertDoesNotMatchAny(apiSource, [
        /requestDto\["userId"\]/,
        /adminCorporateControllerGetAdminCorporateMember/,
      ]);
    });
  },
);
