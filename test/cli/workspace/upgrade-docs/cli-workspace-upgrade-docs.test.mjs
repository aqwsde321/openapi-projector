import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { captureConsoleLog } from '#test-support/cli/console.mjs';
import { runInWorkspace } from '#test-support/cli/workspace.mjs';
import { readTextFiles, writeJsonFile, writeTextFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import {
  projectConfigPath,
  projectReadmePath,
  projectRulesPath,
} from '#test-support/project/paths.mjs';

test(
  'cli upgrade-docs updates generated README without touching config or rules',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-upgrade-docs-', async (workspace) => {
      const configPath = projectConfigPath(workspace);
      const readmePath = projectReadmePath(workspace);
      const rulesPath = projectRulesPath(workspace);

      await writeJsonFile(configPath, {
        sourceUrl: 'https://existing.example.com/v3/api-docs',
        sourcePath: 'custom/openapi.json',
      });
      await writeTextFile(rulesPath, '{ "custom": true }\n');
      await writeTextFile(readmePath, '# stale guide\n');

      const [beforeProjectConfig, beforeProjectRules] = await readTextFiles([
        configPath,
        rulesPath,
      ]);
      const { output } = await captureConsoleLog(() =>
        runInWorkspace(workspace, () => runCli(['upgrade-docs'])),
      );

      const [
        afterProjectConfig,
        afterProjectRules,
        projectReadmeSource,
      ] = await readTextFiles([
        configPath,
        rulesPath,
        readmePath,
      ]);

      assert.equal(afterProjectConfig, beforeProjectConfig);
      assert.equal(afterProjectRules, beforeProjectRules);
      assertMatchesAll(projectReadmeSource, [
        /# openapi-projector Agent Guide/,
        /## AI agent 작업 지침/,
        /### Step 2\. 직접 진행하기/,
        /사용자가 endpoint를 이미 지정했다면 적용 직전 `prepare`로 최신 Swagger\/OpenAPI를 받아 후보를 갱신한 뒤 그 endpoint를 적용합니다/,
        /마지막 성공 후보 기준으로 진행하고, 사용자에게 오래된 후보일 수 있음을 알립니다/,
        /CLI가 `update`, `upgrade-docs`, 또는 `install-skill --force`를 권장하더라도 자동으로 덮어쓰지 않습니다/,
        /Swagger 변경 비교/,
        /산출물 경로 필드는 도구가 관리합니다/,
        /Do not edit `openapi\/config\/project\.jsonc` artifact paths while adapting rules/,
      ]);
      assertDoesNotMatchAny(projectReadmeSource, [
        /### Codex agent용 프롬프트/,
        /### Codex 스킬 없이 또는 다른 AI agent용 프롬프트/,
        /이 프론트엔드 프로젝트에 openapi-projector Codex 스킬을 사용해줘/,
        /### 6\. Git 관리/,
        /npx --yes openapi-projector@latest upgrade-docs/,
        /# stale guide/,
      ]);
      assertMatchesAll(output, [
        /^✓ Updated openapi generated docs in /m,
        /project guide: .*openapi\/README\.md \(overwritten\)/,
        /kept project config: .*openapi\/config\/project\.jsonc/,
        /kept project rules, review history, and generated candidates unchanged/,
      ]);
    });
  },
);
