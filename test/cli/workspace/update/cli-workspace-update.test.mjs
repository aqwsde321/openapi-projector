import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { readJson } from '#src/io/files.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { captureConsoleLog } from '#test-support/cli/console.mjs';
import {
  assertAllExist,
  assertMissing,
} from '#test-support/files/assertions.mjs';
import {
  runInWorkspace,
  workspacePath,
} from '#test-support/cli/workspace.mjs';
import { createExistingUpdateWorkspace } from '#test-support/cli/update-workspace-fixture.mjs';
import { readTextFile, readTextFiles } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import {
  openapiGitignorePath,
  projectRulesAnalysisJsonPath,
  projectRulesAnalysisMarkdownPath,
} from '#test-support/project/paths.mjs';

test(
  'cli update migrates existing workspace without resetting user config or generated outputs',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-update-', async (workspace) => {
      const {
        historyPath,
        projectConfigPath,
        projectReadmePath,
        projectRulesPath,
        projectSummaryPath,
      } = await createExistingUpdateWorkspace(workspace);

      const beforeProjectConfig = await readTextFile(projectConfigPath);
      const { output } = await captureConsoleLog(() =>
        runInWorkspace(workspace, () => runCli(['update'])),
      );

      const [
        afterProjectConfig,
        projectReadmeSource,
        rootGitignoreSource,
        projectSummarySource,
        historySource,
      ] = await readTextFiles([
        projectConfigPath,
        projectReadmePath,
        workspacePath(workspace, '.gitignore'),
        projectSummaryPath,
        historyPath,
      ]);
      const projectRules = await readJson(projectRulesPath);

      assert.equal(afterProjectConfig, beforeProjectConfig);
      assert.equal(projectSummarySource, '# generated summary\n');
      assert.equal(historySource, '# old change history\n');
      assertMatchesAll(projectReadmeSource, [
        /# openapi-projector Agent Guide/,
        /npx --yes openapi-projector@latest prepare/,
        /산출물 경로 필드는 도구가 관리합니다/,
        /Do not edit `openapi\/config\/project\.jsonc` artifact paths while adapting rules/,
      ]);
      assert.equal(projectRules.review.rulesReviewed, true);
      assert.deepEqual(projectRules.review.notes, ['manual review kept']);
      assert.equal(projectRules.api.fetchApiImportPath, '@/custom/api');
      assert.equal(projectRules.api.fetchApiSymbol, 'requestClient');
      assert.equal(projectRules.api.fetchApiImportKind, 'named');
      assert.equal(projectRules.api.adapterStyle, 'url-config');
      assert.equal(projectRules.api.wrapperGrouping, 'flat');
      assert.equal(projectRules.api.tagFileCase, 'title');
      assert.equal(projectRules.hooks.enabled, false);
      assertMatchesAll(rootGitignoreSource, [
        /\.openapi-projector\.local\.jsonc/,
      ]);
      await assertMissing(openapiGitignorePath(workspace));
      await assertAllExist([
        workspacePath(workspace, '.openapi-projector.local.jsonc'),
        projectRulesAnalysisMarkdownPath(workspace),
        projectRulesAnalysisJsonPath(workspace),
      ]);
      assertMatchesAll(output, [
        /^✓ Updated openapi workspace metadata in /m,
        /kept project config: .*openapi\/config\/project\.jsonc/,
        /kept review history and generated candidates unchanged/,
        /Migrated project rules defaults/,
        /added api\.fetchApiImportKind: "named"/,
        /added api\.adapterStyle: "url-config"/,
        /added api\.tagFileCase: "title"/,
        /added hooks\.enabled: false/,
        /check: .*openapi\/config\/project-rules\.jsonc/,
      ]);
      assertDoesNotMatchAny(output, [/updated review\.rulesReviewed/]);
    });
  },
);
