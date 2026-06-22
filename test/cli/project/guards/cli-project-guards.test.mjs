import assert from 'node:assert/strict';
import test from 'node:test';

import { projectCommand } from '#src/commands/project.mjs';
import { runInWorkspace, withWorkspace } from '#test-support/cli/workspace.mjs';
import { assertExists } from '#test-support/files/assertions.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';
import { generatedProjectPath } from '#test-support/project/commands.mjs';
import { createProjectRules } from '#test-support/project/rules-fixture.mjs';

test(
  'project rejects reviewed rules without current defaults before cleaning generated output',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');

    await withWorkspace(
      {
        spec,
        rules: createProjectRules({ includeCurrentDefaults: false }),
        extraFiles: [
          {
            path: 'openapi/project/src/openapi-generated/keep.ts',
            content: 'export const keep = true;\n',
          },
        ],
      },
      async (workspace) => {
        await assert.rejects(
          () => runInWorkspace(workspace, () => projectCommand.run()),
          /Run npx --yes openapi-projector@latest update to add current defaults\./,
        );

        await assertExists(
          generatedProjectPath(workspace, 'keep.ts'),
        );
      },
    );
  },
);
