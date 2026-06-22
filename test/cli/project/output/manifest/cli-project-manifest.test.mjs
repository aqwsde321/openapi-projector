import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import {
  withWorkspace,
} from '#test-support/cli/workspace.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';
import { runGenerateAndProject } from '#test-support/project/commands.mjs';
import { readProjectManifestHandoffOutput } from '#test-support/project/manifest-output-fixture.mjs';
import {
  createRequestConfigFetchApiTypecheckFiles,
  runProjectTypeCheck,
} from '#test-support/project/typescript-files.mjs';

test(
  'project creates tag wrapper candidates and manifest for manual handoff',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas31.json');

    await withWorkspace(
      {
        spec,
        extraFiles: createRequestConfigFetchApiTypecheckFiles(),
        projectConfigOverrides: {
          projectRulesAnalysisPath: 'custom/review/rules.md',
          projectRulesAnalysisJsonPath: 'custom/review/rules.json',
        },
      },
      async (workspace) => {
        await runGenerateAndProject(workspace);

        const {
          defaultApiSource,
          defaultDtoSource,
          manifest,
          profilesApiSource,
          profilesDtoSource,
          summarySource,
        } = await readProjectManifestHandoffOutput(workspace);
        assertMatchesAll(defaultApiSource, [
          /export const getHealthStatus = async/,
          /from '\.\/get-health-status\.dto'/,
          /from '\.\.\/\.\.\/test-support\/fetch-api'/,
        ]);
        assertMatchesAll(defaultDtoSource, [
          /export interface GetHealthStatusResponseDto \{/,
          /message\?: string \| null;/,
        ]);
        assertMatchesAll(profilesApiSource, [
          /export const updateProfile = async/,
          /from '\.\/update-profile\.dto'/,
          /method: "PATCH"/,
          /`\/profiles\/\$\{encodeURIComponent\(String\(id\)\)\}`/,
        ]);
        assertMatchesAll(profilesDtoSource, [/bio\?: string \| null;/]);
        assertDoesNotMatchAny(defaultDtoSource, [/unknown/]);
        assertDoesNotMatchAny(profilesDtoSource, [/unknown/]);
        assert.equal(manifest.projectGeneratedSrcDir, 'openapi/project/src/openapi-generated');
        assert.equal(manifest.projectRulesAnalysisPath, 'custom/review/rules.md');
        assert.equal(manifest.projectRulesAnalysisJsonPath, 'custom/review/rules.json');
        assertMatchesAll(summarySource, [
          /Project rules analysis: custom\/review\/rules\.md/,
          /Project rules analysis JSON: custom\/review\/rules\.json/,
        ]);
        assert.equal('suggestedTargetSrcDir' in manifest, false);
        assert.ok(manifest.files.every((entry) => !('target' in entry)));

        await runProjectTypeCheck(workspace);
      },
    );
  },
);
