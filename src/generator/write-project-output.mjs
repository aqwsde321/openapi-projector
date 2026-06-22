import { writeText } from '../io/files.mjs';
import { collectProjectOperations } from '../openapi/collect-operations.mjs';
import { projectOperations } from '../projector/project-endpoints.mjs';
import { renderOperationHookSection } from './operation-hook/renderer.mjs';
import { writeProjectGeneratedOutputs } from './project-generated-outputs.mjs';
import {
  buildProjectManifest,
  buildProjectRenderOptions,
} from './project-manifest.mjs';
import { renderProjectSummary } from './review.mjs';

async function writeProjectOutputs({
  rootDir,
  spec,
  schemaSourcePath,
  schemaContents,
  projectGeneratedSrcDir,
  projectSummaryPath,
  projectRulesPath,
  projectRulesAnalysisPath = 'openapi/review/project-rules/analysis.md',
  projectRulesAnalysisJsonPath = 'openapi/review/project-rules/analysis.json',
  generatedSchemaPath,
  apiRules = {},
  hookRules = {},
  layoutRules = {},
}) {
  const operations = collectProjectOperations(spec);

  if (operations.length === 0) {
    throw new Error('No endpoints found in OpenAPI spec');
  }

  const projection = projectOperations(operations, apiRules);
  const renderOptions = buildProjectRenderOptions({
    spec,
    apiRules,
  });
  const generatedOutputs = await writeProjectGeneratedOutputs({
    rootDir,
    spec,
    schemaContents,
    projectGeneratedSrcDir,
    projection,
    renderOptions,
    hookRules,
    layoutRules,
  });

  const manifest = buildProjectManifest({
    rootDir,
    schemaSourcePath,
    projectGeneratedSrcDir,
    generatedSchemaPath,
    projectRulesPath,
    projectRulesAnalysisPath,
    projectRulesAnalysisJsonPath,
    operations,
    projection,
    endpointReviews: generatedOutputs.endpointReviews,
    manifestFiles: generatedOutputs.manifestFiles,
    renderOptions,
  });

  await writeText(projectSummaryPath, renderProjectSummary(manifest));

  return manifest;
}

export {
  renderOperationHookSection,
  writeProjectOutputs,
};
