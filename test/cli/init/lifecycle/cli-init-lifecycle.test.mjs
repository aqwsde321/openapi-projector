import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { captureConsoleLog } from '#test-support/cli/console.mjs';
import { assertGeneratedInitReadmeContract } from '#test-support/cli/init-readme-assertions.mjs';
import {
  runInWorkspace,
  workspacePath,
} from '#test-support/cli/workspace.mjs';
import { readTextFiles } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import {
  openapiGitignorePath,
  projectConfigPath,
  projectReadmePath,
} from '#test-support/project/paths.mjs';

test(
  'cli init uses current working directory and creates local config',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-cwd-', async (workspace) => {
      const { output } = await captureConsoleLog(() =>
        runInWorkspace(workspace, () => runCli(['init'])),
      );

      const [
        localConfigSource,
        projectConfigSource,
        projectReadmeSource,
        gitignoreSource,
        openapiGitignoreSource,
      ] = await readTextFiles([
        workspacePath(workspace, '.openapi-projector.local.jsonc'),
        projectConfigPath(workspace),
        projectReadmePath(workspace),
        workspacePath(workspace, '.gitignore'),
        openapiGitignorePath(workspace),
      ]);

      assertMatchesAll(localConfigSource, [/"projectRoot": "\."/]);
      assertDoesNotMatchAny(localConfigSource, [/"sourceUrl"/]);
      assertMatchesAll(projectConfigSource, [
        /"sourceUrl": "http:\/\/localhost:8080\/v3\/api-docs"/,
        /"projectRulesAnalysisJsonPath": "openapi\/review\/project-rules\/analysis\.json"/,
      ]);
      assertGeneratedInitReadmeContract(projectReadmeSource);
      assertMatchesAll(output, [
        /--- sourceUrl config ---/,
        /sourceUrl: http:\/\/localhost:8080\/v3\/api-docs/,
        /edit sourceUrl later: .*openapi[\\/]config[\\/]project\.jsonc \(field: sourceUrl\)/,
        /open: file:.*openapi\/config\/project\.jsonc/,
        /------------------------/,
        /next: run doctor --check-url/,
      ]);
      assertMatchesAll(gitignoreSource, [/\.openapi-projector\.local\.jsonc/]);

      assertMatchesAll(openapiGitignoreSource, [
        /changes\.md/,
        /changes\.json/,
        /_internal\//,
        /review\//,
        /project\//,
      ]);
    });
  },
);
