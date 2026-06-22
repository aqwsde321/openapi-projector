import assert from 'node:assert/strict';
import test from 'node:test';

import { catalogCommand } from '#src/commands/catalog.mjs';
import {
  assertCatalogChangeMarkdown,
  assertCatalogChangeMetadata,
  assertCatalogComparisonRows,
  readCatalogChangeArtifacts,
} from '#test-support/catalog/comparison-assertions.mjs';
import {
  createCatalogComparisonSpec,
  createChangedCatalogComparisonSpec,
} from '#test-support/catalog/comparison-fixture.mjs';
import { rerunCatalogWithSpec } from '#test-support/catalog/commands.mjs';
import { runInWorkspace, withWorkspace } from '#test-support/cli/workspace.mjs';
import { writeTextFile } from '#test-support/files/io.mjs';
import {
  reviewChangesSummaryJsonPath,
  reviewChangesSummaryMarkdownPath,
} from '#test-support/project/paths.mjs';

test(
  'catalog records Slack-friendly contract comparison rows in change history',
  { concurrency: false },
  async () => {
    const spec = createCatalogComparisonSpec();

    await withWorkspace({ spec }, async (workspace) => {
      await runInWorkspace(workspace, () => catalogCommand.run());

      await writeTextFile(
        reviewChangesSummaryMarkdownPath(workspace),
        '# stale summary\n',
      );
      await writeTextFile(
        reviewChangesSummaryJsonPath(workspace),
        '{"stale":true}\n',
      );

      await rerunCatalogWithSpec(workspace, createChangedCatalogComparisonSpec(spec));

      const {
        historyJson,
        historySource,
        openapiGitignoreSource,
        topLevelChangesJson,
        topLevelChangesSource,
      } = await readCatalogChangeArtifacts(workspace);

      assertCatalogChangeMetadata({
        historyJson,
        openapiGitignoreSource,
        topLevelChangesJson,
      });
      assertCatalogComparisonRows(historyJson);
      assertCatalogChangeMarkdown({
        historySource,
        topLevelChangesSource,
      });
    });
  },
);
