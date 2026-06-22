import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { doctorCommand } from '#src/commands/doctor.mjs';
import { REPO_ROOT } from '#test-support/cli/paths.mjs';
import { writeTextFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { jsonDataUrl, readFixtureJson } from '#test-support/fixtures/json.mjs';
import { projectRulesPath } from '#test-support/project/paths.mjs';

test(
  'doctor fails on fresh target when stale project rules file is invalid JSON',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    const sourceUrl = jsonDataUrl(spec);

    await withTempDir('openapi-projector-doctor-', async (workspace) => {
      await writeTextFile(projectRulesPath(workspace), '{ broken json');

      const result = await doctorCommand.run({
        context: {
          targetRoot: workspace,
          toolLocalConfigPath: path.join(REPO_ROOT, '.openapi-projector.local.jsonc'),
          toolLocalConfig: {
            initDefaults: {
              sourceUrl,
            },
          },
        },
      });

      assert.equal(result.ok, false);
    });
  },
);
