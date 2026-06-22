import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { doctorCommand } from '#src/commands/doctor.mjs';
import { REPO_ROOT } from '#test-support/cli/paths.mjs';

test(
  'doctor reports missing local config and projectRoot without throwing',
  { concurrency: false },
  async () => {
    const result = await doctorCommand.run({
      context: {
        targetRoot: null,
        toolLocalConfigPath: path.join(REPO_ROOT, '.openapi-projector.local.jsonc'),
        toolLocalConfig: null,
      },
    });

    assert.equal(result.ok, false);
  },
);
