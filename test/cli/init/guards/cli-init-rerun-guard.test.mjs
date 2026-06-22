import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import {
  runInWorkspace,
  workspacePath,
} from '#test-support/cli/workspace.mjs';
import { assertAllMissing } from '#test-support/files/assertions.mjs';
import { readTextFile, writeJsonFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { buildProjectConfig } from '#test-support/project/config.mjs';
import {
  projectConfigPath,
  projectReadmePath,
} from '#test-support/project/paths.mjs';

test(
  'cli init fails without force when project config already exists',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-rerun-', async (workspace) => {
      const configPath = projectConfigPath(workspace);

      await writeJsonFile(
        configPath,
        buildProjectConfig({
          sourceUrl: 'https://existing.example.com/v3/api-docs',
        }),
      );

      await assert.rejects(
        () => runInWorkspace(workspace, () => runCli(['init'])),
        /Project config already exists: .*openapi\/config\/project\.jsonc\nFor existing workspaces, run npx --yes openapi-projector@latest update\.\nUse init --force only to reset bootstrap files\./,
      );

      const projectConfigSource = await readTextFile(configPath);

      assertMatchesAll(projectConfigSource, [
        /"sourceUrl": "https:\/\/existing\.example\.com\/v3\/api-docs"/,
      ]);
      await assertAllMissing([
        workspacePath(workspace, '.openapi-projector.local.jsonc'),
        projectReadmePath(workspace),
      ]);
    });
  },
);
