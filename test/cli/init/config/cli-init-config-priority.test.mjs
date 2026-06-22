import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import {
  runInWorkspace,
  workspacePath,
} from '#test-support/cli/workspace.mjs';
import { assertMissing } from '#test-support/files/assertions.mjs';
import { writeJsonFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { buildProjectConfig } from '#test-support/project/config.mjs';
import { projectConfigPath } from '#test-support/project/paths.mjs';

test(
  'cli init refuses to create lower-priority config when root config already exists',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-root-config-', async (workspace) => {
      await writeJsonFile(
        workspacePath(workspace, 'openapi.config.jsonc'),
        buildProjectConfig({
          sourceUrl: 'https://old.example.com/v3/api-docs',
        }),
      );

      await assert.rejects(
        () => runInWorkspace(workspace, () =>
          runCli(['init', '--source-url', 'https://new.example.com/v3/api-docs']),
        ),
        /Project config already exists: .*openapi\.config\.jsonc\nThis config has priority over .*openapi\/config\/project\.jsonc/,
      );
      await assert.rejects(
        () => runInWorkspace(workspace, () =>
          runCli(['init', '--force', '--source-url', 'https://new.example.com/v3/api-docs']),
        ),
        /Project config already exists: .*openapi\.config\.jsonc\nThis config has priority over .*openapi\/config\/project\.jsonc/,
      );
      await assertMissing(projectConfigPath(workspace));
    });
  },
);
