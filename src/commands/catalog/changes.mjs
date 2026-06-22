import {
  buildChangeSummary,
  withEndpointPreviews,
} from '../../catalog/changes/change-report.mjs';
import { readJson } from '../../io/files.mjs';
import { buildProjectCandidateFilesByOperation } from './project-candidate-files.mjs';

async function readJsonIfExists(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function buildCatalogChanges({
  catalogEntries,
  catalogJsonPath,
  projectConfig,
  projectConfigOverrides,
  rootDir,
  spec,
}) {
  const previousCatalog = await readJsonIfExists(catalogJsonPath);
  const projectCandidateFilesByOperation = await buildProjectCandidateFilesByOperation({
    rootDir,
    spec,
    projectConfig,
  });
  const changeSummary = buildChangeSummary(
    previousCatalog?.endpoints ?? null,
    catalogEntries,
    previousCatalog?.version ?? null,
    projectCandidateFilesByOperation,
  );
  const markdownChangeSummary = withEndpointPreviews(
    changeSummary,
    previousCatalog?.endpoints ?? [],
    catalogEntries,
    projectConfig,
    projectConfigOverrides,
  );

  return {
    changeSummary,
    markdownChangeSummary,
  };
}

export { buildCatalogChanges };
