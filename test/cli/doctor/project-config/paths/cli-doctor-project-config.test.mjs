import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { doctorCommand } from '#src/commands/doctor.mjs';
import { REPO_ROOT } from '#test-support/cli/paths.mjs';
import { writeJsonFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { projectConfigPath } from '#test-support/project/paths.mjs';

test(
  'doctor fails when existing project config has unsafe generated paths',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-doctor-', async (workspace) => {
      await writeJsonFile(projectConfigPath(workspace), {
        sourceUrl: 'https://api.example.com/v3/api-docs',
        sourcePath: '../openapi.json',
      });

      const result = await doctorCommand.run({
        context: {
          targetRoot: workspace,
          toolLocalConfigPath: path.join(REPO_ROOT, '.openapi-projector.local.jsonc'),
          toolLocalConfig: null,
        },
      });

      assert.equal(result.ok, false);
    });
  },
);
