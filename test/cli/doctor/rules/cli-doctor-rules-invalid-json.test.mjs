import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { doctorCommand } from '#src/commands/doctor.mjs';
import { REPO_ROOT } from '#test-support/cli/paths.mjs';
import { withWorkspace } from '#test-support/cli/workspace.mjs';
import { jsonDataUrl, readFixtureJson } from '#test-support/fixtures/json.mjs';
import { writeJsonFile, writeTextFile } from '#test-support/files/io.mjs';
import { buildProjectConfig } from '#test-support/project/config.mjs';
import {
  projectConfigPath,
  projectRulesPath,
} from '#test-support/project/paths.mjs';

test(
  'doctor fails when existing project rules file is invalid JSON',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    const sourceUrl = jsonDataUrl(spec);

    await withWorkspace({ spec }, async (workspace) => {
      await writeJsonFile(
        projectConfigPath(workspace),
        buildProjectConfig({
          sourceUrl,
          includeProjectRulesAnalysisJsonPath: false,
        }),
      );
      await writeTextFile(projectRulesPath(workspace), '{ broken json');

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
