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
} from '#test-support/catalog/swagger-fixture.mjs';
import { runInWorkspace, withWorkspace } from '#test-support/cli/workspace.mjs';
import { writeJsonFile } from '#test-support/files/io.mjs';
import { projectConfigPath } from '#test-support/project/paths.mjs';

test(
  'catalog does not infer Swagger UI links from default sourceUrl in CI-style config',
  { concurrency: false },
  async () => {
    const spec = createCatalogSwaggerBaseSpec({ title: 'CI API' });

    await withWorkspace({ spec }, async (workspace) => {
      await writeJsonFile(projectConfigPath(workspace), {});
      await runInWorkspace(workspace, () => catalogCommand.run());

      await rerunCatalogWithSpec(
        workspace,
        createCatalogSwaggerAddedCategorySpec(spec, {
          operationId: 'createCategory',
          summary: 'Create category',
          tag: 'Categories',
          withBody: false,
        }),
      );

      const { source: topLevelChangesSource } =
        await readTopLevelCatalogChanges(workspace);

      assertMatchesAll(topLevelChangesSource, [/\[POST\] `\/categories`/]);
      assertDoesNotMatchAny(topLevelChangesSource, [
        /\[Swagger\]/,
        /localhost:8080\/swagger-ui/,
      ]);
    });
  },
);
