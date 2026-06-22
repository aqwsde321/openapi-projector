import test from 'node:test';

import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { withWorkspace } from '#test-support/cli/workspace.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';
import {
  readGeneratedProjectSource,
  runGenerateAndProject,
} from '#test-support/project/commands.mjs';
import { addWildcardErrorCodesResponse } from '#test-support/project/media-fixture.mjs';

test(
  'project accepts wildcard json-like response media type',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    addWildcardErrorCodesResponse(spec);

    await withWorkspace({ spec }, async (workspace) => {
      await runGenerateAndProject(workspace);

      const devApiSource = await readGeneratedProjectSource(
        workspace,
        'Dev/get-dev-error-codes.api.ts',
      );

      assertMatchesAll(devApiSource, [/const getDevErrorCodes = async/]);
      assertDoesNotMatchAny(devApiSource, [/void/]);
    });
  },
);
