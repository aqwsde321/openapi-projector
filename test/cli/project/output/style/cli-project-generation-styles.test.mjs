import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertAllExist,
  assertMissing,
} from '#test-support/files/assertions.mjs';
import {
  withWorkspace,
} from '#test-support/cli/workspace.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';
import {
  generatedProjectPath,
  runGenerateAndProject,
} from '#test-support/project/commands.mjs';
import { addBosBannerEndpoint } from '#test-support/project/tag-file-case-fixture.mjs';
import {
  createAxiosFetchApiTypecheckFiles,
  runProjectTypeCheck,
} from '#test-support/project/typescript-files.mjs';

test(
  'project can use raw tag titles as folder names',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    addBosBannerEndpoint(spec);

    await withWorkspace(
      {
        spec,
        extraFiles: createAxiosFetchApiTypecheckFiles(),
        rules: {
          api: {
            fetchApiImportPath: '../../test-support/fetch-api',
            fetchApiSymbol: 'fetchAPI',
            axiosConfigImportPath: '../../test-support/http',
            axiosConfigTypeName: 'AxiosRequestConfig',
            adapterStyle: 'url-config',
            wrapperGrouping: 'tag',
            tagFileCase: 'title',
          },
          layout: {
            schemaFileName: 'schema.ts',
          },
        },
      },
      async (workspace) => {
        await runGenerateAndProject(workspace);

        await assertAllExist([
          generatedProjectPath(workspace, '199 - [BOS]원문 노출 API/get-banner.dto.ts'),
          generatedProjectPath(workspace, '199 - [BOS]원문 노출 API/get-banner.api.ts'),
        ]);
        await assertMissing(generatedProjectPath(workspace, 'index.ts'));

        await runProjectTypeCheck(workspace);
      },
    );
  },
);
