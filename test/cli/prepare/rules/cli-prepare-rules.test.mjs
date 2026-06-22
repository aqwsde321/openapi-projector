import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { readJson } from '#src/io/files.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { captureConsoleLog } from '#test-support/cli/console.mjs';
import { assertExists } from '#test-support/files/assertions.mjs';
import {
  runInWorkspace,
  withWorkspace,
} from '#test-support/cli/workspace.mjs';
import { jsonDataUrl, readFixtureJson } from '#test-support/fixtures/json.mjs';
import { writeJsonFile } from '#test-support/files/io.mjs';
import {
  projectConfigPath,
  projectRulesPath,
  projectSummaryPath,
} from '#test-support/project/paths.mjs';
import { createProjectRules } from '#test-support/project/rules-fixture.mjs';

test(
  'prepare warns and keeps reviewed project rules usable when current defaults are missing',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');

    await withWorkspace({ spec }, async (workspace) => {
      const configPath = projectConfigPath(workspace);
      const rulesPath = projectRulesPath(workspace);
      const projectConfig = await readJson(configPath);
      await writeJsonFile(configPath, {
        ...projectConfig,
        sourceUrl: jsonDataUrl(spec),
      });
      await writeJsonFile(
        rulesPath,
        createProjectRules({ includeCurrentDefaults: false }),
      );

      const { output } = await captureConsoleLog(() =>
        runInWorkspace(workspace, () => runCli(['prepare'])),
      );
      const projectRules = await readJson(rulesPath);

      assertMatchesAll(output, [
        /project rules are missing defaults added by the current CLI/,
        /missing: api\.fetchApiImportKind/,
        /missing: api\.adapterStyle/,
        /this run will add safe defaults/,
        /check: openapi\/config\/project-rules\.jsonc/,
        /added api\.fetchApiImportKind: "named"/,
        /added api\.adapterStyle: "url-config"/,
      ]);
      assertDoesNotMatchAny(output, [
        /next: npx --yes openapi-projector@latest update/,
        /updated review\.rulesReviewed/,
      ]);
      assert.equal(projectRules.review.rulesReviewed, true);
      assert.equal(projectRules.api.fetchApiImportKind, 'named');
      assert.equal(projectRules.api.adapterStyle, 'url-config');
      await assertExists(projectSummaryPath(workspace));
    });
  },
);
