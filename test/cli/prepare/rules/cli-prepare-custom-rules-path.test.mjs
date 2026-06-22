import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { readJson } from '#src/io/files.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { captureConsoleLog } from '#test-support/cli/console.mjs';
import { assertMissing } from '#test-support/files/assertions.mjs';
import {
  runInWorkspace,
  workspacePath,
  withWorkspace,
} from '#test-support/cli/workspace.mjs';
import { jsonDataUrl, readFixtureJson } from '#test-support/fixtures/json.mjs';
import { writeJsonFile } from '#test-support/files/io.mjs';
import { projectRulesPath as defaultProjectRulesPath } from '#test-support/project/paths.mjs';
import { createProjectRules } from '#test-support/project/rules-fixture.mjs';

test(
  'prepare points missing-defaults warning at configured project rules path',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    const projectRulesPath = 'custom/project-rules.jsonc';
    const sourceUrl = jsonDataUrl(spec);

    await withWorkspace(
      {
        spec,
        createRulesFile: false,
        projectConfigOverrides: {
          sourceUrl,
          projectRulesPath,
          projectRulesAnalysisPath: null,
          projectRulesAnalysisJsonPath: null,
        },
      },
      async (workspace) => {
        const rulesPath = workspacePath(workspace, projectRulesPath);

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
          /check: custom\/project-rules\.jsonc/,
        ]);
        assertDoesNotMatchAny(output, [
          /check: openapi\/config\/project-rules\.jsonc/,
        ]);
        assert.equal(projectRules.review.rulesReviewed, true);
        assert.equal(projectRules.api.fetchApiImportKind, 'named');
        assert.equal(projectRules.api.adapterStyle, 'url-config');
        await assertMissing(defaultProjectRulesPath(workspace));
      },
    );
  },
);
