import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { doctorCommand } from '#src/commands/doctor.mjs';
import { readJson } from '#src/io/files.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { captureConsoleLog } from '#test-support/cli/console.mjs';
import { REPO_ROOT } from '#test-support/cli/paths.mjs';
import {
  withWorkspace,
} from '#test-support/cli/workspace.mjs';
import { jsonDataUrl, readFixtureJson } from '#test-support/fixtures/json.mjs';
import { writeJsonFile } from '#test-support/files/io.mjs';
import { createProjectRules } from '#test-support/project/rules-fixture.mjs';
import { projectConfigPath as defaultProjectConfigPath } from '#test-support/project/paths.mjs';

test(
  'doctor fails readiness when project rules are valid but not reviewed',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    const sourceUrl = jsonDataUrl(spec);

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
        const projectConfigPath = defaultProjectConfigPath(workspace);
        const projectConfig = await readJson(projectConfigPath);
        await writeJsonFile(projectConfigPath, {
          ...projectConfig,
          sourceUrl,
        });

        const { result, output } = await captureConsoleLog(() =>
          doctorCommand.run({
            context: {
              targetRoot: workspace,
              toolLocalConfigPath: path.join(REPO_ROOT, '.openapi-projector.local.jsonc'),
              toolLocalConfig: null,
            },
          }),
        );

        assert.equal(result.ok, false);
        assertMatchesAll(output, [
          /Project rules are valid but not reviewed/,
          /Review custom\/review\/rules\.md and custom\/review\/rules\.json, then edit openapi\/config\/project-rules\.jsonc/,
          /review\.rulesReviewed to true/,
          /Result: fix failed checks before continuing/,
        ]);
        assertDoesNotMatchAny(output, [
          /Review openapi\/review\/project-rules\/analysis\.md/,
        ]);
      },
    );
  },
);
