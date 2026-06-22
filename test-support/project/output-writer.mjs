import { writeProjectOutputs } from '#src/generator/write-project-output.mjs';
import { buildProjectConfig } from '#test-support/project/config.mjs';
import {
  projectGeneratedRootPath,
  projectManifestPath,
  projectSummaryPath,
  sourceOpenApiPath,
} from '#test-support/project/paths.mjs';

function projectOutputPaths(workspace) {
  return {
    generatedDir: projectGeneratedRootPath(workspace),
    manifestPath: projectManifestPath(workspace),
    schemaSourcePath: sourceOpenApiPath(workspace),
    summaryPath: projectSummaryPath(workspace),
  };
}

function writeProjectOutputFixture(workspace, options) {
  const paths = projectOutputPaths(workspace);
  const projectConfig = buildProjectConfig();

  return writeProjectOutputs({
    rootDir: workspace,
    schemaSourcePath: paths.schemaSourcePath,
    schemaContents: 'export type Contracts = never;\n',
    projectGeneratedSrcDir: paths.generatedDir,
    projectManifestPath: paths.manifestPath,
    projectSummaryPath: paths.summaryPath,
    projectRulesPath: projectConfig.projectRulesPath,
    generatedSchemaPath: projectConfig.generatedSchemaPath,
    apiRules: {},
    layoutRules: {},
    ...options,
  });
}

export { projectOutputPaths, writeProjectOutputFixture };
