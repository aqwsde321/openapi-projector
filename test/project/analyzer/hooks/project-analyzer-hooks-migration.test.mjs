import assert from 'node:assert/strict';
import test from 'node:test';

import { readJson } from '#src/io/files.mjs';
import {
  projectRulesPath,
  runRulesAnalysis,
  writeProjectRules,
  writeUsersApiSource,
} from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';
import { writeProjectConfig } from '#test-support/project/config.mjs';

test('rules migrates existing rules to enable hooks when React Query usage is detected', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeProjectRules(workspace, {
      review: {
        rulesReviewed: true,
        notes: ['already reviewed'],
      },
      api: {
        fetchApiImportPath: '@/custom/api',
        fetchApiSymbol: 'customFetch',
        fetchApiImportKind: 'named',
        adapterStyle: 'url-config',
        wrapperGrouping: 'tag',
      },
      layout: {
        schemaFileName: 'schema.ts',
      },
    });
    await writeUsersApiSource(workspace, [
      "import { useMutation } from '@tanstack/react-query';",
      "import { request } from '@/shared/request';",
      '',
      'export const useUpdateUserMutation = () =>',
      '  useMutation({',
      "    mutationFn: () => request({ url: '/users/1', method: 'PATCH' }),",
      '  });',
      '',
    ]);

    await runRulesAnalysis(workspace);

    const rules = await readJson(projectRulesPath(workspace));

    assert.equal(rules.review.rulesReviewed, true);
    assert.equal(rules.api.fetchApiImportPath, '@/custom/api');
    assert.equal(rules.api.fetchApiSymbol, 'customFetch');
    assert.equal(rules.api.tagFileCase, 'title');
    assert.equal(rules.hooks.enabled, true);
    assert.equal(rules.hooks.library, '@tanstack/react-query');
  });
});
