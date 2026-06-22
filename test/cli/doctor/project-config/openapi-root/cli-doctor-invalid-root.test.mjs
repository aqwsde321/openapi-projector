import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { doctorCommand } from '#src/commands/doctor.mjs';
import { readJson } from '#src/io/files.mjs';
import { REPO_ROOT } from '#test-support/cli/paths.mjs';
import {
  withWorkspace,
} from '#test-support/cli/workspace.mjs';
import { jsonDataUrl } from '#test-support/fixtures/json.mjs';
import { writeJsonFile } from '#test-support/files/io.mjs';
import { projectConfigPath as defaultProjectConfigPath } from '#test-support/project/paths.mjs';

test(
  'doctor fails when downloaded OpenAPI JSON has invalid root shape',
  { concurrency: false },
  async () => {
    const spec = {
      openapi: '3.0.3',
      info: {
        title: 'Malformed API',
        version: '1.0.0',
      },
      paths: [],
    };
    const sourceUrl = jsonDataUrl(spec);

    await withWorkspace({ spec }, async (workspace) => {
      const projectConfigPath = defaultProjectConfigPath(workspace);
      const projectConfig = await readJson(projectConfigPath);
      await writeJsonFile(projectConfigPath, {
        ...projectConfig,
        sourceUrl,
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
