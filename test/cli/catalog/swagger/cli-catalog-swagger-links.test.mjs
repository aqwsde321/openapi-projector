import test from 'node:test';

import { catalogCommand } from '#src/commands/catalog.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import {
  readTopLevelCatalogChanges,
  rerunCatalogWithSpec,
} from '#test-support/catalog/commands.mjs';
import {
  createCatalogSwaggerAddedCategorySpec,
  createCatalogSwaggerBaseSpec,
  createExpectedCatalogSwaggerUrl,
} from '#test-support/catalog/swagger-fixture.mjs';
import { runInWorkspace, withWorkspace } from '#test-support/cli/workspace.mjs';

test(
  'catalog renders added endpoint Swagger UI deep links without previews',
  { concurrency: false },
  async () => {
    const sourceUrl = 'https://dev-api.pharmaresearch.com/v3/api-docs';
    const spec = createCatalogSwaggerBaseSpec();

    await withWorkspace(
      {
        spec,
        projectConfigOverrides: {
          sourceUrl,
        },
      },
      async (workspace) => {
        await runInWorkspace(workspace, () => catalogCommand.run());

        await rerunCatalogWithSpec(workspace, createCatalogSwaggerAddedCategorySpec(spec));

        const { source: topLevelChangesSource } =
          await readTopLevelCatalogChanges(workspace);
        const expectedSwaggerUrl = createExpectedCatalogSwaggerUrl(sourceUrl);

        assertMatchesAll(topLevelChangesSource, [
          new RegExp(`\\[Swagger\\]\\(<${expectedSwaggerUrl}>\\)`),
          /\[POST\] `\/categories`/,
        ]);
        assertDoesNotMatchAny(topLevelChangesSource, [
          /\| AS-IS \| TO-BE \|/,
          /- Body: CreateCategoryRequest/,
        ]);
      },
    );
  },
);
