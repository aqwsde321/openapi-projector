import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { REPO_ROOT } from '#test-support/cli/paths.mjs';
import { writeJsonFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { buildProjectConfig } from '#test-support/project/config.mjs';
import { projectConfigPath } from '#test-support/project/paths.mjs';

const execFileAsync = promisify(execFile);

test(
  'cli executable prefixes refresh failures with failure mark',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-cli-failure-', async (workspace) => {
      await writeJsonFile(
        projectConfigPath(workspace),
        buildProjectConfig({
          sourceUrl: 'data:application/json,not-json',
        }),
      );

      await assert.rejects(
        () =>
          execFileAsync(process.execPath, [
            path.join(REPO_ROOT, 'bin/openapi-tool.mjs'),
            '--project-root',
            workspace,
            'refresh',
        ]),
        (error) => {
          assert.equal(error.code, 1);
          assertMatchesAll(error.stdout, [/^✓ Downloaded OpenAPI spec to /m]);
          assertMatchesAll(error.stderr, [
            /^x Only OpenAPI 3\.0\/3\.1 JSON is supported in MVP v2\./,
          ]);
          return true;
        },
      );
    });
  },
);
