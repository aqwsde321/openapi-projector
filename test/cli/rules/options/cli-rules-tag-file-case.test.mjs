import test from 'node:test';

import { rulesCommand } from '#src/commands/rules.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { runInWorkspace, withWorkspace } from '#test-support/cli/workspace.mjs';
import { assertExists } from '#test-support/files/assertions.mjs';
import { readTextFile } from '#test-support/files/io.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';
import { runGenerateAndProject } from '#test-support/project/commands.mjs';
import {
  generatedProjectPath,
  projectRulesPath,
} from '#test-support/project/paths.mjs';
import { addBosBannerEndpoint } from '#test-support/project/tag-file-case-fixture.mjs';
import { createAxiosFetchApiTestFiles } from '#test-support/project/typescript-files.mjs';

test(
  'rules preserves customized kebab tagFileCase',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    addBosBannerEndpoint(spec);

    await withWorkspace(
      {
        spec,
        rules: {
          api: {
            fetchApiImportPath: '../../test-support/fetch-api',
            fetchApiSymbol: 'fetchAPI',
            axiosConfigImportPath: '../../test-support/http',
            axiosConfigTypeName: 'AxiosRequestConfig',
            adapterStyle: 'url-config',
            wrapperGrouping: 'tag',
            tagFileCase: 'kebab',
          },
          layout: {
            schemaFileName: 'schema.ts',
          },
        },
        extraFiles: createAxiosFetchApiTestFiles(),
      },
      async (workspace) => {
        await runInWorkspace(workspace, () => rulesCommand.run());

        const migratedRulesSource = await readTextFile(projectRulesPath(workspace));
        assertMatchesAll(migratedRulesSource, [/"tagFileCase": "kebab"/]);
        assertDoesNotMatchAny(migratedRulesSource, [/"tagFileCase": "title"/]);

        await runGenerateAndProject(workspace);

        await assertExists(
          generatedProjectPath(
            workspace,
            '199-bos-api/get-banner.dto.ts',
          ),
        );
      },
    );
  },
);
