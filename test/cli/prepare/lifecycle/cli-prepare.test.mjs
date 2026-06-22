import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { readJson } from '#src/io/files.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { captureConsoleLog } from '#test-support/cli/console.mjs';
import { assertAllExist } from '#test-support/files/assertions.mjs';
import { runInWorkspace } from '#test-support/cli/workspace.mjs';
import { jsonDataUrl, readFixtureJson } from '#test-support/fixtures/json.mjs';
import { writeJsonFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { setProjectSourceUrl } from '#test-support/project/config.mjs';
import {
  projectConfigPath,
  projectManifestPath,
  projectRulesPath,
  projectSummaryPath,
  reviewGeneratedSchemaPath,
} from '#test-support/project/paths.mjs';

test(
  'prepare generates project candidate output from current working directory',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    const sourceUrl = jsonDataUrl(spec);

    await withTempDir('openapi-projector-prepare-', async (workspace) => {
      await runInWorkspace(
        workspace,
        async () => {
          await runCli(['init']);
          await setProjectSourceUrl(workspace, sourceUrl);
          const rulesPath = projectRulesPath(workspace);
          const projectRules = await readJson(rulesPath);
          await writeJsonFile(rulesPath, {
            ...projectRules,
            review: {
              ...(projectRules.review ?? {}),
              rulesReviewed: true,
            },
          });
          const { output } = await captureConsoleLog(() => runCli(['prepare']));

          assertMatchesAll(output, [
            /^✓ prepare: running in /m,
            /^✓ init: skipped because project config already exists/m,
            /^✓ refresh: Swagger\/OpenAPI를 내려받고 이전 버전과 비교해 openapi\/changes\.md를 만듭니다\./m,
            /^✓ rules: 현재 프론트엔드 프로젝트의 API 호출 규칙을 분석해 openapi\/config\/project-rules\.jsonc를 만듭니다\./m,
            /^✓ project: 검토된 규칙으로 DTO\/API 후보를 생성합니다\./m,
            /^✓ prepare complete: openapi\/project\/summary\.md를 확인하세요\./m,
          ]);

          await assertAllExist([
            projectConfigPath(workspace),
            reviewGeneratedSchemaPath(workspace),
            projectRulesPath(workspace),
            projectManifestPath(workspace),
            projectSummaryPath(workspace),
          ]);
        },
      );
    });
  },
);
