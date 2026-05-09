import fs from 'node:fs/promises';
import path from 'node:path';

import {
  cleanDir,
  loadProjectConfig,
  loadProjectRules,
  writeJson,
} from '../core/openapi-utils.mjs';
import {
  loadSupportedOpenApiSpec,
  resolveGeneratedSchemaPath,
} from '../openapi/load-spec.mjs';
import { assertProjectRulesReviewed } from '../config/validation.mjs';
import { resolveProjectRulesAnalysisPaths } from '../config/project-paths.mjs';
import { getProjectRulesMissingCurrentDefaults } from './rules.mjs';
import { renderProjectSummary, writeProjectOutputs } from '../openapi/project-generator.mjs';
import { formatSuccess } from '../cli-format.mjs';

function toPosixPath(value) {
  return value.replaceAll(path.sep, '/');
}

const projectCommand = {
  name: 'project',
  async run(options = {}) {
    const context = Array.isArray(options) ? {} : (options.context ?? {});
    const rootDir = context.targetRoot ?? process.cwd();
    const { projectConfig } = await loadProjectConfig(rootDir);
    const { projectRulesPath, projectRules } = await loadProjectRules(rootDir, projectConfig);
    const { analysisPath, analysisJsonPath } = resolveProjectRulesAnalysisPaths(rootDir, projectConfig);
    const relativeProjectRulesPath = toPosixPath(path.relative(rootDir, projectRulesPath));
    const relativeAnalysisPath = toPosixPath(path.relative(rootDir, analysisPath));
    const relativeAnalysisJsonPath = toPosixPath(path.relative(rootDir, analysisJsonPath));

    try {
      assertProjectRulesReviewed(projectRules, {
        projectRulesPath: relativeProjectRulesPath,
        projectRulesAnalysisPath: relativeAnalysisPath,
        projectRulesAnalysisJsonPath: relativeAnalysisJsonPath,
      });
    } catch (error) {
      const missingFields = getProjectRulesMissingCurrentDefaults(projectRules);
      if (missingFields.length > 0) {
        throw new Error(
          [
            error.message,
            `Run npx --yes openapi-projector@latest update to add current defaults.`,
            `Then check ${relativeProjectRulesPath}.`,
          ].join('\n'),
        );
      }
      throw error;
    }

    const sourcePath = path.resolve(rootDir, projectConfig.sourcePath);
    const generatedSchemaPath = resolveGeneratedSchemaPath(rootDir, projectConfig);
    const projectGeneratedSrcDir = path.resolve(rootDir, projectConfig.projectGeneratedSrcDir);
    const projectRootDir = path.resolve(projectGeneratedSrcDir, '..', '..');
    const projectManifestPath = path.join(projectRootDir, 'manifest.json');
    const projectSummaryPath = path.join(projectRootDir, 'summary.md');
    const spec = await loadSupportedOpenApiSpec(sourcePath);

    let schemaContents;
    try {
      schemaContents = await fs.readFile(generatedSchemaPath, 'utf8');
    } catch (error) {
      if (error?.code === 'ENOENT') {
        throw new Error(
          `Generated schema not found: ${generatedSchemaPath}\nRun npx --yes openapi-projector@latest generate first.`,
        );
      }
      throw error;
    }

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
      generatedSchemaPath: toPosixPath(path.relative(rootDir, generatedSchemaPath)),
      apiRules: projectRules.api ?? {},
      hookRules: projectRules.hooks ?? {},
      layoutRules: projectRules.layout ?? {},
    });

    await writeJson(projectManifestPath, manifest);

    console.log(formatSuccess(`Generated project candidate files into ${projectGeneratedSrcDir}`));
    console.log(`- manifest: ${projectManifestPath}`);
    console.log(`- summary: ${projectSummaryPath}`);
    console.log(renderProjectSummary(manifest));
  },
};

export { projectCommand, resolveProjectRulesAnalysisPaths };
