import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { doctorCommand } from '#src/commands/doctor.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { captureConsoleLog } from '#test-support/cli/console.mjs';
import { REPO_ROOT } from '#test-support/cli/paths.mjs';
import { writeJsonFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { jsonDataUrl, readFixtureJson } from '#test-support/fixtures/json.mjs';
import { createProjectRules } from '#test-support/project/rules-fixture.mjs';
import { projectRulesPath } from '#test-support/project/paths.mjs';

test(
  'doctor fails readiness on fresh target when stale project rules are unreviewed',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    const sourceUrl = jsonDataUrl(spec);

    await withTempDir('openapi-projector-doctor-', async (workspace) => {
      await writeJsonFile(projectRulesPath(workspace), createProjectRules({ rulesReviewed: false }));

      const { result, output } = await captureConsoleLog(() =>
        doctorCommand.run({
          context: {
            targetRoot: workspace,
            toolLocalConfigPath: path.join(REPO_ROOT, '.openapi-projector.local.jsonc'),
            toolLocalConfig: {
              initDefaults: {
                sourceUrl,
              },
            },
          },
        }),
      );

      assert.equal(result.ok, false);
      assertMatchesAll(output, [/Existing project rules are valid but not reviewed/]);
    });
  },
);
