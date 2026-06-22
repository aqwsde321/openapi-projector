import test from 'node:test';

import { rulesCommand } from '#src/commands/rules.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { runInWorkspace, withWorkspace } from '#test-support/cli/workspace.mjs';
import { readTextFiles } from '#test-support/files/io.mjs';
import { readFixtureJson } from '#test-support/fixtures/json.mjs';
import {
  projectRulesAnalysisMarkdownPath,
  projectRulesPath,
} from '#test-support/project/paths.mjs';

test(
  'rules falls back to src and creates minimal scaffold',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    const extraFiles = [
      {
        path: 'src/features/user/api.ts',
        content: `import { fetchAPI } from '@/shared/http';\nimport type { AxiosRequestConfig } from '@/shared/http-types';\n\nexport async function loadUser(config?: AxiosRequestConfig) {\n  return fetchAPI('/users', config ?? {});\n}\n`,
      },
    ];

    await withWorkspace(
      { spec, createRulesFile: false, extraFiles },
      async (workspace) => {
        await runInWorkspace(workspace, () => rulesCommand.run());

        const [analysisSource, rulesSource] = await readTextFiles([
          projectRulesAnalysisMarkdownPath(workspace),
          projectRulesPath(workspace),
        ]);

        assertMatchesAll(analysisSource, [/Analysis root: `src`/]);
        assertMatchesAll(rulesSource, [
          /"fetchApiImportPath": "@\/shared\/http"/,
          /"tagFileCase": "title"/,
        ]);
        assertDoesNotMatchAny(rulesSource, [
          /apiUrlsImportPath/,
          /axiosConfigImportPath/,
        ]);
      },
    );
  },
);
