import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { assertAllExist } from '#test-support/files/assertions.mjs';
import {
  runInWorkspace,
} from '#test-support/cli/workspace.mjs';
import { readTextFiles, writeJsonFile, writeTextFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import {
  openapiGitignorePath,
  projectConfigPath,
  projectReadmePath,
  projectRulesPath,
} from '#test-support/project/paths.mjs';

test(
  'cli init force reinitializes existing bootstrap files',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-force-', async (workspace) => {
      const configPath = projectConfigPath(workspace);
      const readmePath = projectReadmePath(workspace);
      const rulesPath = projectRulesPath(workspace);
      const gitignorePath = openapiGitignorePath(workspace);

      await writeJsonFile(configPath, {
        sourceUrl: 'https://existing.example.com/v3/api-docs',
        sourcePath: 'custom/openapi.json',
      });
      await writeTextFile(rulesPath, '{ "custom": true }\n');
      await writeTextFile(readmePath, '# custom guide\n');
      await writeTextFile(gitignorePath, 'custom-cache.json\n');

      await runInWorkspace(workspace, () => runCli(['init', '--force']));

      const [
        projectConfigSource,
        projectRulesSource,
        projectReadmeSource,
        openapiGitignoreSource,
      ] = await readTextFiles([
        configPath,
        rulesPath,
        readmePath,
        gitignorePath,
      ]);

      assertMatchesAll(projectConfigSource, [
        /"sourceUrl": "http:\/\/localhost:8080\/v3\/api-docs"/,
      ]);
      assertMatchesAll(projectRulesSource, [
        /"rulesReviewed": false/,
        /"fetchApiImportPath": "@\/shared\/api"/,
        /"fetchApiImportKind": "named"/,
      ]);
      assertMatchesAll(projectReadmeSource, [
        /# openapi-projector Agent Guide/,
        /## 빠른 시작/,
        /<details>/,
        /<summary>AI Agents: Detailed Workflow<\/summary>/,
        /## For AI Agents: Detailed Workflow/,
      ]);
      assertDoesNotMatchAny(projectReadmeSource, [
        /<summary>AI에게 붙여넣을 프롬프트<\/summary>/,
      ]);
      assert.equal(
        openapiGitignoreSource,
        '# openapi-projector generated artifacts\nchanges.md\nchanges.json\n_internal/\nreview/\nproject/\n',
      );
      await assertAllExist([readmePath, rulesPath]);
    });
  },
);
