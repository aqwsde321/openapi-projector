import { catalogCommand } from '#src/commands/catalog.mjs';
import { readJson } from '#src/io/files.mjs';
import { runInWorkspace } from '#test-support/cli/workspace.mjs';
import { readTextFile, writeJsonFile } from '#test-support/files/io.mjs';
import {
  sourceOpenApiPath,
  topLevelChangesJsonPath,
  topLevelChangesMarkdownPath,
} from '#test-support/project/paths.mjs';

async function runCatalog(workspace) {
  await runInWorkspace(workspace, () => catalogCommand.run());
}

async function rerunCatalogWithSpec(workspace, spec) {
  await writeJsonFile(sourceOpenApiPath(workspace), spec);
  await runCatalog(workspace);
}

async function readTopLevelCatalogChanges(workspace) {
  return {
    json: await readJson(topLevelChangesJsonPath(workspace)),
    source: await readTextFile(topLevelChangesMarkdownPath(workspace)),
  };
}

export { readTopLevelCatalogChanges, rerunCatalogWithSpec, runCatalog };
