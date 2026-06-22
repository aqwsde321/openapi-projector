import assert from 'node:assert/strict';
import test from 'node:test';

import { projectCommand } from '#src/commands/project.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { runInWorkspace, withWorkspace } from '#test-support/cli/workspace.mjs';
import { assertMissing } from '#test-support/files/assertions.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';
import { projectManifestPath } from '#test-support/project/commands.mjs';
import { createProjectRules } from '#test-support/project/rules-fixture.mjs';

test(
  'project stops until project rules are reviewed',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');

    await withWorkspace(
      {
        spec,
        projectConfigOverrides: {
          projectRulesAnalysisPath: 'custom/review/rules.md',
          projectRulesAnalysisJsonPath: 'custom/review/rules.json',
        },
        rules: createProjectRules({ rulesReviewed: false }),
      },
      async (workspace) => {
        await assert.rejects(
          () => runInWorkspace(workspace, () => projectCommand.run()),
          (error) => {
            assertMatchesAll(error.message, [
              /Project rules have not been reviewed/,
              /Review custom\/review\/rules\.md and custom\/review\/rules\.json, then edit openapi\/config\/project-rules\.jsonc/,
            ]);
            assertDoesNotMatchAny(error.message, [
              /Review openapi\/review\/project-rules\/analysis\.md/,
            ]);
            return true;
          },
        );

        await assertMissing(projectManifestPath(workspace));
      },
    );
  },
);
