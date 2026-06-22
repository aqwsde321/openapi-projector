import { toProjectRelativePath } from '../core/path-utils.mjs';
import { buildRuntimeWrapperReview } from './review.mjs';

function buildProjectRenderOptions({
  spec,
  apiRules = {},
}) {
  return {
    spec,
    runtimeFetchImportPath: apiRules.fetchApiImportPath ?? '@/shared/api',
    runtimeFetchSymbol: apiRules.fetchApiSymbol ?? 'fetchAPI',
    runtimeFetchImportKind: apiRules.fetchApiImportKind === 'default' ? 'default' : 'named',
    runtimeCallStyle: apiRules.adapterStyle === 'request-object' ? 'request-object' : 'url-config',
  };
}

function buildProjectManifest({
  rootDir,
  schemaSourcePath,
  projectGeneratedSrcDir,
  projectRulesPath,
  projectRulesAnalysisPath,
  projectRulesAnalysisJsonPath,
  generatedSchemaPath,
  operations,
  projection,
  endpointReviews,
  manifestFiles,
  renderOptions,
}) {
  return {
    generatedAt: new Date().toISOString(),
    sourcePath: toProjectRelativePath(rootDir, schemaSourcePath),
    generatedSchemaPath,
    projectRulesPath,
    projectRulesAnalysisPath,
    projectRulesAnalysisJsonPath,
    projectGeneratedSrcDir: toProjectRelativePath(rootDir, projectGeneratedSrcDir),
    totalEndpoints: operations.length,
    generatedEndpoints: projection.generatedEndpoints,
    skippedEndpoints: projection.skippedOperations.length,
    skippedOperations: projection.skippedOperations,
    applicationReview: {
      runtimeWrapper: buildRuntimeWrapperReview(renderOptions),
      endpoints: endpointReviews,
    },
    files: manifestFiles,
  };
}

export {
  buildProjectManifest,
  buildProjectRenderOptions,
};
