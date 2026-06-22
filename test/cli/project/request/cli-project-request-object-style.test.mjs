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
import {
  createProjectTsconfigFile,
  runProjectTypeCheck,
} from '#test-support/project/typescript-files.mjs';

test(
  'project can generate request-object runtime call style without internal adapter files',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');

    await withWorkspace(
      {
        spec,
        rules: {
          api: {
            fetchApiImportPath: '../../test-support/request-client',
            fetchApiSymbol: 'request',
            axiosConfigImportPath: '../../test-support/request-client',
            axiosConfigTypeName: 'RequestOptions',
            adapterStyle: 'request-object',
            wrapperGrouping: 'tag',
            tagFileCase: 'kebab',
          },
          layout: {
            schemaFileName: 'schema.ts',
          },
        },
        extraFiles: [
          {
            path: 'openapi/project/src/test-support/request-client.ts',
            content: `export type RequestOptions = {\n  method?: string;\n  params?: unknown;\n  data?: unknown;\n  headers?: Record<string, string>;\n  url?: string;\n};\n\nexport async function request<T>(_options: RequestOptions): Promise<T> {\n  return undefined as T;\n}\n`,
          },
          createProjectTsconfigFile(),
        ],
      },
      async (workspace) => {
        await runGenerateAndProject(workspace);

        const userApiSource = await readGeneratedProjectSource(
          workspace,
          'users/get-user-by-id.api.ts',
        );
        assertMatchesAll(userApiSource, [
          /import \{ request as fetchAPI \} from '\.\.\/\.\.\/test-support\/request-client'/,
          /await fetchAPI<GetUserByIdResponseDto>\(\{/,
          /const \{ id \} = requestDto;/,
          /url: `\/users\/\$\{encodeURIComponent\(String\(id\)\)\}`/,
          /from '\.\/get-user-by-id\.dto'/,
        ]);
        assertDoesNotMatchAny(userApiSource, [/_internal\/fetch-api-adapter/]);

        await runProjectTypeCheck(workspace);
      },
    );
  },
);
