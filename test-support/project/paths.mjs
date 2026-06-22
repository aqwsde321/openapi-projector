import path from 'node:path';

function projectConfigPath(workspace) {
  return path.join(workspace, 'openapi/config/project.jsonc');
}

function projectConfigDirPath(workspace) {
  return path.join(workspace, 'openapi/config');
}

function projectRulesPath(workspace) {
  return path.join(workspace, 'openapi/config/project-rules.jsonc');
}

function projectRulesAnalysisJsonPath(workspace) {
  return path.join(workspace, 'openapi/review/project-rules/analysis.json');
}

function projectRulesAnalysisMarkdownPath(workspace) {
  return path.join(workspace, 'openapi/review/project-rules/analysis.md');
}

function reviewDocsDirPath(workspace) {
  return path.join(workspace, 'openapi/review/docs');
}

function reviewGeneratedSchemaPath(workspace) {
  return path.join(workspace, 'openapi/review/generated/schema.ts');
}

function reviewCatalogEndpointsPath(workspace) {
  return path.join(workspace, 'openapi/review/catalog/endpoints.json');
}

function reviewChangesDirPath(workspace) {
  return path.join(workspace, 'openapi/review/changes');
}

function reviewChangesHistoryDirPath(workspace) {
  return path.join(reviewChangesDirPath(workspace), 'history');
}

function reviewChangesSummaryJsonPath(workspace) {
  return path.join(reviewChangesDirPath(workspace), 'summary.json');
}

function reviewChangesSummaryMarkdownPath(workspace) {
  return path.join(reviewChangesDirPath(workspace), 'summary.md');
}

function topLevelChangesJsonPath(workspace) {
  return path.join(workspace, 'openapi/changes.json');
}

function topLevelChangesMarkdownPath(workspace) {
  return path.join(workspace, 'openapi/changes.md');
}

function projectReadmePath(workspace) {
  return path.join(workspace, 'openapi/README.md');
}

function openapiGitignorePath(workspace) {
  return path.join(workspace, 'openapi/.gitignore');
}

function projectGeneratedRootPath(workspace) {
  return path.join(workspace, 'openapi/project/src/openapi-generated');
}

function generatedProjectPath(workspace, generatedPath) {
  return path.join(projectGeneratedRootPath(workspace), generatedPath);
}

function projectManifestPath(workspace) {
  return path.join(workspace, 'openapi/project/manifest.json');
}

function projectSummaryPath(workspace) {
  return path.join(workspace, 'openapi/project/summary.md');
}

function sourceOpenApiPath(workspace) {
  return path.join(workspace, 'openapi/_internal/source/openapi.json');
}

export {
  generatedProjectPath,
  openapiGitignorePath,
  projectConfigDirPath,
  projectConfigPath,
  projectGeneratedRootPath,
  projectManifestPath,
  projectReadmePath,
  projectRulesAnalysisJsonPath,
  projectRulesAnalysisMarkdownPath,
  projectRulesPath,
  projectSummaryPath,
  reviewCatalogEndpointsPath,
  reviewChangesDirPath,
  reviewChangesHistoryDirPath,
  reviewChangesSummaryJsonPath,
  reviewChangesSummaryMarkdownPath,
  reviewDocsDirPath,
  reviewGeneratedSchemaPath,
  sourceOpenApiPath,
  topLevelChangesJsonPath,
  topLevelChangesMarkdownPath,
};
