import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { doctorCommand } from '#src/commands/doctor.mjs';
import { REPO_ROOT } from '#test-support/cli/paths.mjs';
import {
  withWorkspace,
} from '#test-support/cli/workspace.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';

test(
  'doctor fails when existing project config has blank sourceUrl',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');

    await withWorkspace({ spec }, async (workspace) => {
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
