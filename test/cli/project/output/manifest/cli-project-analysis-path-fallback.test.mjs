import assert from 'node:assert/strict';
import test from 'node:test';

import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { withWorkspace } from '#test-support/cli/workspace.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';
import {
  readProjectManifest,
  readProjectSummary,
  runGenerateAndProject,
} from '#test-support/project/commands.mjs';

test(
  'project falls back when optional project rules analysis paths are null',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas31.json');

    await withWorkspace(
      {
        spec,
        projectConfigOverrides: {
          projectRulesAnalysisPath: null,
          projectRulesAnalysisJsonPath: null,
        },
      },
      async (workspace) => {
        await runGenerateAndProject(workspace);

        const manifest = await readProjectManifest(workspace);
        const summarySource = await readProjectSummary(workspace);

        assert.equal(manifest.projectRulesAnalysisPath, 'openapi/review/project-rules/analysis.md');
        assert.equal(
          manifest.projectRulesAnalysisJsonPath,
          'openapi/review/project-rules/analysis.json',
        );
        assertMatchesAll(summarySource, [
          /Project rules analysis: openapi\/review\/project-rules\/analysis\.md/,
          /Project rules analysis JSON: openapi\/review\/project-rules\/analysis\.json/,
        ]);
      },
    );
  },
);
