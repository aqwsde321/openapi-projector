import path from 'node:path';

import { writeText } from '../core/openapi-utils.mjs';
import { classifyProjectOperations } from '../openapi/classify-operations.mjs';
import { collectProjectOperations } from '../openapi/collect-operations.mjs';
import { buildTagDirectoryName } from '../projector/layout.mjs';
import { renderTagFolderOutputs } from './render-api.mjs';
import { renderIndexSource } from './render-index.mjs';
import { renderProjectSummary } from './render-summary.mjs';

async function writeProjectOutputs({
  rootDir,
  spec,
  schemaSourcePath,
  schemaContents,
  projectGeneratedSrcDir,
  projectManifestPath,
  projectSummaryPath,
  projectRulesPath,
  generatedSchemaPath,
  apiRules,
  layoutRules,
}) {
  const operations = collectProjectOperations(spec);

  if (operations.length === 0) {
    throw new Error('No endpoints found in OpenAPI spec');
  }

  const { supportedOperations, skippedOperations } = classifyProjectOperations(operations);

  const schemaFileName = layoutRules.schemaFileName ?? 'schema.ts';
  const schemaFileBase = path.basename(
    schemaFileName,
    path.extname(schemaFileName),
  );
  const schemaOutputPath = path.join(projectGeneratedSrcDir, schemaFileName);
  const indexOutputPath = path.join(projectGeneratedSrcDir, 'index.ts');
  const tagFileMap = new Map();
  const manifestFiles = [];

  await writeText(schemaOutputPath, schemaContents);
  manifestFiles.push({
    kind: 'schema',
    generated: path.relative(rootDir, schemaOutputPath).replaceAll(path.sep, '/'),
  });

  for (const operation of supportedOperations) {
    const tagFileName = buildTagDirectoryName(
      operation.tag || 'default',
      apiRules.tagFileCase ?? 'title',
    );
    if (!tagFileMap.has(tagFileName)) {
      tagFileMap.set(tagFileName, []);
    }
    tagFileMap.get(tagFileName).push(operation);
  }

  const sortedTagFileNames = Array.from(tagFileMap.keys()).sort((left, right) =>
    left.localeCompare(right),
  );

  for (const tagFileName of sortedTagFileNames) {
    const tagDirectoryPath = path.join(projectGeneratedSrcDir, tagFileName);
    const tagIndexPath = path.join(tagDirectoryPath, 'index.ts');
    const renderedTag = renderTagFolderOutputs({
      spec,
      operations: tagFileMap.get(tagFileName),
      runtimeFetchImportPath: apiRules.fetchApiImportPath ?? '@/shared/api',
      runtimeFetchSymbol: apiRules.fetchApiSymbol ?? 'fetchAPI',
      runtimeCallStyle: apiRules.adapterStyle === 'request-object' ? 'request-object' : 'url-config',
    });
    for (const endpointFile of renderedTag.endpointFiles) {
      const dtoFilePath = path.join(tagDirectoryPath, `${endpointFile.endpointFileBase}.dto.ts`);
      const apiFilePath = path.join(tagDirectoryPath, `${endpointFile.endpointFileBase}.api.ts`);

      await writeText(dtoFilePath, endpointFile.dtoSource);
      manifestFiles.push({
        kind: 'dto',
        generated: path.relative(rootDir, dtoFilePath).replaceAll(path.sep, '/'),
        summary: `tag=${tagFileName} endpoint=${endpointFile.endpointFileBase}`,
      });

      await writeText(apiFilePath, endpointFile.apiSource);
      manifestFiles.push({
        kind: 'api',
        generated: path.relative(rootDir, apiFilePath).replaceAll(path.sep, '/'),
        summary: `tag=${tagFileName} endpoint=${endpointFile.endpointFileBase}`,
      });
    }

    await writeText(tagIndexPath, renderedTag.indexSource);
    manifestFiles.push({
      kind: 'index',
      generated: path.relative(rootDir, tagIndexPath).replaceAll(path.sep, '/'),
      summary: `tag=${tagFileName}`,
    });
  }

  await writeText(
    indexOutputPath,
    renderIndexSource(sortedTagFileNames, schemaFileBase),
  );
  manifestFiles.push({
    kind: 'index',
    generated: path.relative(rootDir, indexOutputPath).replaceAll(path.sep, '/'),
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourcePath: path.relative(rootDir, schemaSourcePath).replaceAll(path.sep, '/'),
    generatedSchemaPath,
    projectRulesPath,
    projectGeneratedSrcDir: path.relative(rootDir, projectGeneratedSrcDir).replaceAll(path.sep, '/'),
    totalEndpoints: operations.length,
    generatedEndpoints: supportedOperations.length,
    skippedEndpoints: skippedOperations.length,
    skippedOperations,
    files: manifestFiles,
  };

  await writeText(projectSummaryPath, renderProjectSummary(manifest));

  return manifest;
}

export { writeProjectOutputs };
