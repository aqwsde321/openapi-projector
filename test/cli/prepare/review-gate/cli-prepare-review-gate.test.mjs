import assert from 'node:assert/strict';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { captureConsoleLog } from '#test-support/cli/console.mjs';
import { assertExists, assertMissing } from '#test-support/files/assertions.mjs';
import { runInWorkspace } from '#test-support/cli/workspace.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';
import { jsonDataUrl, readFixtureJson } from '#test-support/fixtures/json.mjs';
import { setProjectSourceUrl } from '#test-support/project/config.mjs';
import {
  projectManifestPath,
  projectRulesAnalysisMarkdownPath,
} from '#test-support/project/paths.mjs';

test(
  'prepare stops before project until project rules are reviewed',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    const sourceUrl = jsonDataUrl(spec);

    await withTempDir('openapi-projector-prepare-review-', async (workspace) => {
      await runInWorkspace(
        workspace,
        async () => {
          await runCli(['init']);
          await setProjectSourceUrl(workspace, sourceUrl);

          const { output } = await captureConsoleLog(() =>
            assert.rejects(
              () => runCli(['prepare']),
              /Project rules have not been reviewed/,
            ),
          );
          assertMatchesAll(output, [
            /- manual: openapi\/config\/project-rules\.jsonc에서 review\.rulesReviewed=true로 설정/,
          ]);
          assertDoesNotMatchAny(output, [
            /- update: openapi\/config\/project-rules\.jsonc/,
          ]);
          await assert.rejects(
            () => runCli(['prepare', '--project']),
            /Project rules have not been reviewed/,
          );
          await assert.rejects(
            () => runCli(['prepare', '--yes']),
            /Project rules have not been reviewed/,
          );
          await assert.rejects(
            () => runCli(['prepare', '--force-project']),
            /Project rules have not been reviewed/,
          );

          await assertExists(projectRulesAnalysisMarkdownPath(workspace));
          await assertMissing(projectManifestPath(workspace));
        },
      );
    });
  },
);
