import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { captureConsoleLog } from '#test-support/cli/console.mjs';
import {
  runInWorkspace,
  workspacePath,
  withWorkspace,
} from '#test-support/cli/workspace.mjs';
import { jsonDataUrl, readFixtureJson } from '#test-support/fixtures/json.mjs';
import { writeJsonFile } from '#test-support/files/io.mjs';
import { createProjectRules } from '#test-support/project/rules-fixture.mjs';

test(
  'prepare points review gate warning at configured project rules path',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    const projectRulesPath = 'custom/project-rules.jsonc';
    const sourceUrl = jsonDataUrl(spec);

    await withWorkspace(
      {
        spec,
        createRulesFile: false,
        projectConfigOverrides: {
          sourceUrl,
          projectRulesPath,
        },
      },
      async (workspace) => {
        await writeJsonFile(
          workspacePath(workspace, projectRulesPath),
          createProjectRules({
            rulesReviewed: false,
            notes: ['manual review pending'],
            hooks: {
              enabled: false,
              library: '@tanstack/react-query',
              queryMethods: ['GET'],
              mutationMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
              queryKeyStrategy: 'path-and-params',
              responseUnwrap: 'none',
            },
          }),
        );

        const { output } = await captureConsoleLog(() =>
          assert.rejects(
            () => runInWorkspace(workspace, () => runCli(['prepare'])),
            (error) => {
              assertMatchesAll(error.message, [
                /Project rules have not been reviewed/,
                /Review openapi\/review\/project-rules\/analysis\.md and openapi\/review\/project-rules\/analysis\.json/,
                /edit custom\/project-rules\.jsonc/,
              ]);
              assertDoesNotMatchAny(error.message, [
                /edit openapi\/config\/project-rules\.jsonc/,
              ]);
              return true;
            },
          ),
        );

        assertMatchesAll(output, [
          /manual: custom\/project-rules\.jsonc에서 review\.rulesReviewed=true로 설정/,
        ]);
        assertDoesNotMatchAny(output, [
          /manual: openapi\/config\/project-rules\.jsonc/,
        ]);
      },
    );
  },
);
