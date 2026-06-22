import {
  resolveGeneratedSchemaPath,
  resolveOpenApiSourcePath,
  resolveProjectOutputPaths,
} from '../../config/project-paths.mjs';
import {
  loadProjectConfig,
  loadProjectRules,
} from '../../core/project-workspace.mjs';
import { relativePosixPath } from '../../core/path-utils.mjs';
import { writeProjectOutputs } from '../../generator/write-project-output.mjs';
import { cleanDir } from '../../io/files.mjs';
import { loadSupportedOpenApiSpec } from '../../openapi/load-spec.mjs';
import {
  readGeneratedSchemaContents,
  writeProjectCommandResult,
} from './command-output.mjs';
import { assertProjectRulesReadyForProject } from './rules-gate.mjs';

async function buildProjectCandidate(rootDir) {
  const { projectConfig } = await loadProjectConfig(rootDir);
  const { projectRulesPath, projectRules } = await loadProjectRules(rootDir, projectConfig);
  const {
    relativeProjectRulesPath,
    relativeAnalysisPath,
    relativeAnalysisJsonPath,
  } = assertProjectRulesReadyForProject({
    projectConfig,
    projectRules,
    projectRulesPath,
    rootDir,
  });

  const sourcePath = resolveOpenApiSourcePath(rootDir, projectConfig);
  const generatedSchemaPath = resolveGeneratedSchemaPath(rootDir, projectConfig);
  const {
    projectGeneratedSrcDir,
    projectManifestPath,
    projectSummaryPath,
  } = resolveProjectOutputPaths(rootDir, projectConfig);
  const spec = await loadSupportedOpenApiSpec(sourcePath);
  const schemaContents = await readGeneratedSchemaContents(generatedSchemaPath);

  await cleanDir(projectGeneratedSrcDir);

  const manifest = await writeProjectOutputs({
    rootDir,
    spec,
    schemaSourcePath: sourcePath,
    schemaContents,
    projectGeneratedSrcDir,
    projectSummaryPath,
    projectRulesPath: relativeProjectRulesPath,
    projectRulesAnalysisPath: relativeAnalysisPath,
    projectRulesAnalysisJsonPath: relativeAnalysisJsonPath,
    generatedSchemaPath: relativePosixPath(rootDir, generatedSchemaPath),
    apiRules: projectRules.api ?? {},
    hookRules: projectRules.hooks ?? {},
    layoutRules: projectRules.layout ?? {},
  });

  await writeProjectCommandResult({
    manifest,
    projectGeneratedSrcDir,
    projectManifestPath,
    projectSummaryPath,
  });
}

export { buildProjectCandidate };
