import { buildEndpointCatalog } from '../../catalog/endpoint-catalog.mjs';
import { resolveGenerateCommandPaths } from '../../config/project-paths.mjs';
import { loadProjectConfig } from '../../core/project-workspace.mjs';
import { loadSupportedOpenApiSpec } from '../../openapi/load-spec.mjs';
import { printGenerateSummary } from './output.mjs';
import { writeGenerateOutputs } from './outputs.mjs';
import { generateSchemaTypes } from './schema-types.mjs';

async function runGenerate(rootDir) {
  const { projectConfig } = await loadProjectConfig(rootDir);
  const {
    docsDir,
    generatedSchemaPath,
    legacyEndpointsDir,
    reviewGeneratedDir,
    sourceFileUrl,
    sourcePath,
  } = resolveGenerateCommandPaths(rootDir, projectConfig);

  const spec = await loadSupportedOpenApiSpec(sourcePath);
  const endpoints = buildEndpointCatalog(spec);
  const schemaSource = await generateSchemaTypes(sourceFileUrl);

  await writeGenerateOutputs({
    docsDir,
    endpoints,
    generatedSchemaPath,
    legacyEndpointsDir,
    reviewGeneratedDir,
    schemaSource,
    spec,
  });
  printGenerateSummary({
    docsDir,
    endpoints,
    generatedSchemaPath,
    legacyEndpointsDir,
  });
}

export { runGenerate };
