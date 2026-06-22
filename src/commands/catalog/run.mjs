import {
  ensureOpenapiGitignore,
  removeLegacyChangeSummary,
  writeCatalogOutputs,
} from '../../catalog/catalog-outputs.mjs';
import { buildEndpointCatalog } from '../../catalog/endpoint-catalog.mjs';
import { resolveCatalogCommandPaths } from '../../config/project-paths.mjs';
import { loadProjectConfig } from '../../core/project-workspace.mjs';
import { loadSupportedOpenApiSpec } from '../../openapi/load-spec.mjs';
import { buildCatalogChanges } from './changes.mjs';
import { printCatalogSummary } from './summary.mjs';

async function runCatalog(rootDir) {
  const { projectConfig, projectConfigOverrides } = await loadProjectConfig(rootDir);

  const {
    catalogJsonPath,
    catalogMarkdownPath,
    changesDir,
    changesIndexJsonPath,
    changesIndexMarkdownPath,
    historyDir,
    openapiRoot,
    sourcePath,
  } = resolveCatalogCommandPaths(rootDir, projectConfig);
  await ensureOpenapiGitignore(openapiRoot);
  await removeLegacyChangeSummary(changesDir);

  const spec = await loadSupportedOpenApiSpec(sourcePath);
  const catalogEntries = buildEndpointCatalog(spec);
  const { changeSummary, markdownChangeSummary } = await buildCatalogChanges({
    catalogEntries,
    catalogJsonPath,
    projectConfig,
    projectConfigOverrides,
    rootDir,
    spec,
  });
  await writeCatalogOutputs({
    catalogEntries,
    catalogJsonPath,
    catalogMarkdownPath,
    changeSummary,
    changesIndexJsonPath,
    changesIndexMarkdownPath,
    historyDir,
    markdownChangeSummary,
    openapiRoot,
    rootDir,
  });
  printCatalogSummary({
    catalogEntries,
    catalogJsonPath,
    changeSummary,
    changesIndexMarkdownPath,
  });
}

export { runCatalog };
