import { readTextFile, writeJsonFile, writeTextFile } from '#test-support/files/io.mjs';
import { projectConfigPath } from '#test-support/project/paths.mjs';

async function setProjectSourceUrl(workspace, sourceUrl) {
  const configPath = projectConfigPath(workspace);
  const source = await readTextFile(configPath);
  await writeTextFile(
    configPath,
    source.replace(
      '"sourceUrl": "http://localhost:8080/v3/api-docs"',
      `"sourceUrl": ${JSON.stringify(sourceUrl)}`,
    ),
  );
}

function buildProjectConfig({
  sourceUrl = '',
  includeProjectRulesAnalysisJsonPath = true,
  overrides = {},
} = {}) {
  const config = {
    sourceUrl: '',
    sourcePath: 'openapi/_internal/source/openapi.json',
    catalogJsonPath: 'openapi/review/catalog/endpoints.json',
    catalogMarkdownPath: 'openapi/review/catalog/endpoints.md',
    docsDir: 'openapi/review/docs',
    generatedSchemaPath: 'openapi/review/generated/schema.ts',
    projectRulesAnalysisPath: 'openapi/review/project-rules/analysis.md',
    projectRulesAnalysisJsonPath: 'openapi/review/project-rules/analysis.json',
    projectRulesPath: 'openapi/config/project-rules.jsonc',
    projectGeneratedSrcDir: 'openapi/project/src/openapi-generated',
    ...overrides,
  };

  if (sourceUrl !== '') {
    config.sourceUrl = sourceUrl;
  }
  if (
    !includeProjectRulesAnalysisJsonPath
    && !Object.hasOwn(overrides, 'projectRulesAnalysisJsonPath')
  ) {
    delete config.projectRulesAnalysisJsonPath;
  }

  return config;
}

async function writeProjectConfig(workspace) {
  await writeJsonFile(projectConfigPath(workspace), buildProjectConfig());
}

export { buildProjectConfig, setProjectSourceUrl, writeProjectConfig };
