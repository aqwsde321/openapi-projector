import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { withWorkspace } from '#test-support/cli/workspace.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';
import {
  readGeneratedProjectSources,
  readProjectManifest,
  runGenerateAndProject,
} from '#test-support/project/commands.mjs';
import { addTypedReportMediaAlternatives } from '#test-support/project/media-fixture.mjs';

test(
  'project selects supported JSON media types from alternatives',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    addTypedReportMediaAlternatives(spec);

    await withWorkspace({ spec }, async (workspace) => {
      await runGenerateAndProject(workspace);

      const [dtoSource, apiSource] = await readGeneratedProjectSources(workspace, [
        'Reports/create-typed-report.dto.ts',
        'Reports/create-typed-report.api.ts',
      ]);
      const manifest = await readProjectManifest(workspace);

      assertMatchesAll(dtoSource, [
        /export interface CreateTypedReportRequestDto \{/,
        /name: string;/,
        /export interface CreateTypedReportResponseDto \{/,
        /id: string;/,
      ]);
      assertDoesNotMatchAny(dtoSource, [
        /export type CreateTypedReportRequestDto = string;/,
        /export type CreateTypedReportResponseDto = string;/,
      ]);
      assertMatchesAll(apiSource, [/data: requestDto/]);
      assert.equal(manifest.skippedEndpoints, 0);
    });
  },
);
