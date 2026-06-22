import test from 'node:test';

import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { withWorkspace } from '#test-support/cli/workspace.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';
import {
  readGeneratedProjectSources,
  runGenerateAndProject,
} from '#test-support/project/commands.mjs';

test(
  'project serializes cookie parameters into request headers',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    spec.paths['/sessions'] = {
      get: {
        tags: ['Sessions'],
        operationId: 'getSession',
        parameters: [
          {
            name: 'sessionId',
            in: 'cookie',
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
                },
              },
            },
          },
        },
      },
    };

    await withWorkspace({ spec }, async (workspace) => {
      await runGenerateAndProject(workspace);

      const [sessionApiSource, sessionDtoSource] = await readGeneratedProjectSources(workspace, [
        'Sessions/get-session.api.ts',
        'Sessions/get-session.dto.ts',
      ]);
      assertMatchesAll(sessionApiSource, [
        /export const getSession = async \(requestDto: GetSessionRequestDto\)/,
        /cookieEntries.length > 0/,
        /headers\.Cookie = cookieEntries\.join\('\; '\)/,
      ]);
      assertMatchesAll(sessionDtoSource, [
        /export interface GetSessionRequestDto \{/,
        /sessionId: string;/,
      ]);
    });
  },
);
