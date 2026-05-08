import path from 'node:path';

import { writeText } from '../core/openapi-utils.mjs';
import { collectProjectOperations } from '../openapi/collect-operations.mjs';
import { projectOperations } from '../projector/project-endpoints.mjs';
import {
  buildEndpointApplicationReview,
  buildRuntimeWrapperReview,
} from './application-review.mjs';
import { renderTagFolderOutputs } from './render-api.mjs';
import { renderOperationHookSection } from './render-hooks.mjs';
import { renderProjectSummary } from './render-summary.mjs';

function toProjectRelativePath(rootDir, filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, '/');
}

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

  const schemaFileName = layoutRules.schemaFileName ?? 'schema.ts';
  const schemaOutputPath = path.join(projectGeneratedSrcDir, schemaFileName);
  const manifestFiles = [];
  const endpointReviews = [];

  await writeText(schemaOutputPath, schemaContents);
  manifestFiles.push({
    kind: 'schema',
    generated: toProjectRelativePath(rootDir, schemaOutputPath),
  });

  const renderOptions = {
    spec,
    runtimeFetchImportPath: apiRules.fetchApiImportPath ?? '@/shared/api',
    runtimeFetchSymbol: apiRules.fetchApiSymbol ?? 'fetchAPI',
    runtimeFetchImportKind: apiRules.fetchApiImportKind === 'default' ? 'default' : 'named',
    runtimeCallStyle: apiRules.adapterStyle === 'request-object' ? 'request-object' : 'url-config',
  };

  if (projection.wrapperGrouping === 'flat') {
    const renderedFlat = renderTagFolderOutputs({
      ...renderOptions,
      endpoints: projection.flatEndpoints,
    });

    for (const [index, endpointFile] of renderedFlat.endpointFiles.entries()) {
      const endpoint = projection.flatEndpoints[index];
      const dtoFilePath = path.join(projectGeneratedSrcDir, `${endpointFile.endpointFileBase}.dto.ts`);
      const apiFilePath = path.join(projectGeneratedSrcDir, `${endpointFile.endpointFileBase}.api.ts`);
      const dtoRelativePath = toProjectRelativePath(rootDir, dtoFilePath);
      const apiRelativePath = toProjectRelativePath(rootDir, apiFilePath);
      const hookFile = renderOperationHookSection({
        spec,
        operation: endpoint.operation,
        functionName: endpoint.functionName,
        endpointFileBase: endpointFile.endpointFileBase,
        hookRules,
      });
      const hookFilePath = hookFile
        ? path.join(projectGeneratedSrcDir, `${hookFile.hookFileBase}.ts`)
        : null;
      const hookRelativePath = hookFilePath
        ? toProjectRelativePath(rootDir, hookFilePath)
        : null;

      await writeText(dtoFilePath, endpointFile.dtoSource);
      manifestFiles.push({
        kind: 'dto',
        generated: dtoRelativePath,
        summary: `endpoint=${endpointFile.endpointFileBase}`,
      });

      await writeText(apiFilePath, endpointFile.apiSource);
      manifestFiles.push({
        kind: 'api',
        generated: apiRelativePath,
        summary: `endpoint=${endpointFile.endpointFileBase}`,
      });

      if (hookFile && hookFilePath && hookRelativePath) {
        await writeText(hookFilePath, hookFile.hookSource);
        manifestFiles.push({
          kind: `${hookFile.hookKind}-hook`,
          generated: hookRelativePath,
          summary: `endpoint=${endpointFile.endpointFileBase} hook=${hookFile.hookName}`,
        });
      }

      endpointReviews.push(
        buildEndpointApplicationReview({
          spec,
          endpoint,
          dtoPath: dtoRelativePath,
          apiPath: apiRelativePath,
          hookPath: hookRelativePath,
        }),
      );
    }
  } else {
    for (const tagDirectory of projection.tagDirectories) {
      const tagFileName = tagDirectory.tagDirectoryName;
      const tagDirectoryPath = path.join(projectGeneratedSrcDir, tagFileName);
      const renderedTag = renderTagFolderOutputs({
        ...renderOptions,
        endpoints: tagDirectory.endpoints,
      });

      for (const [index, endpointFile] of renderedTag.endpointFiles.entries()) {
        const endpoint = tagDirectory.endpoints[index];
        const dtoFilePath = path.join(
          tagDirectoryPath,
          `${endpointFile.endpointFileBase}.dto.ts`,
        );
        const apiFilePath = path.join(
          tagDirectoryPath,
          `${endpointFile.endpointFileBase}.api.ts`,
        );
        const dtoRelativePath = toProjectRelativePath(rootDir, dtoFilePath);
        const apiRelativePath = toProjectRelativePath(rootDir, apiFilePath);
        const hookFile = renderOperationHookSection({
          spec,
          operation: endpoint.operation,
          functionName: endpoint.functionName,
          endpointFileBase: endpointFile.endpointFileBase,
          hookRules,
        });
        const hookFilePath = hookFile
          ? path.join(tagDirectoryPath, `${hookFile.hookFileBase}.ts`)
          : null;
        const hookRelativePath = hookFilePath
          ? toProjectRelativePath(rootDir, hookFilePath)
          : null;

        await writeText(dtoFilePath, endpointFile.dtoSource);
        manifestFiles.push({
          kind: 'dto',
          generated: dtoRelativePath,
          summary: `tag=${tagFileName} endpoint=${endpointFile.endpointFileBase}`,
        });

        await writeText(apiFilePath, endpointFile.apiSource);
        manifestFiles.push({
          kind: 'api',
          generated: apiRelativePath,
          summary: `tag=${tagFileName} endpoint=${endpointFile.endpointFileBase}`,
        });

        if (hookFile && hookFilePath && hookRelativePath) {
          await writeText(hookFilePath, hookFile.hookSource);
          manifestFiles.push({
            kind: `${hookFile.hookKind}-hook`,
            generated: hookRelativePath,
            summary: `tag=${tagFileName} endpoint=${endpointFile.endpointFileBase} hook=${hookFile.hookName}`,
          });
        }

        endpointReviews.push(
          buildEndpointApplicationReview({
            spec,
            endpoint,
            dtoPath: dtoRelativePath,
            apiPath: apiRelativePath,
            hookPath: hookRelativePath,
          }),
        );
      }
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourcePath: path.relative(rootDir, schemaSourcePath).replaceAll(path.sep, '/'),
    generatedSchemaPath,
    projectRulesPath,
    projectRulesAnalysisPath,
    projectRulesAnalysisJsonPath,
    projectGeneratedSrcDir: path.relative(rootDir, projectGeneratedSrcDir).replaceAll(path.sep, '/'),
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

  await writeText(projectSummaryPath, renderProjectSummary(manifest));

  return manifest;
}

export { writeProjectOutputs };
