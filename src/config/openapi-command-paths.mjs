import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  resolveGeneratedSchemaPath,
  resolveOpenApiRootPath,
  resolveOpenApiSourcePath,
} from './openapi-workspace-paths.mjs';

function resolveCatalogCommandPaths(rootDir, projectConfig) {
  const sourcePath = resolveOpenApiSourcePath(rootDir, projectConfig);
  const catalogJsonPath = path.resolve(rootDir, projectConfig.catalogJsonPath);
  const catalogMarkdownPath = path.resolve(rootDir, projectConfig.catalogMarkdownPath);
  const reviewRoot = path.resolve(path.dirname(catalogMarkdownPath), '..');
  const changesDir = path.join(reviewRoot, 'changes');
  const historyDir = path.join(changesDir, 'history');
  const openapiRoot = resolveOpenApiRootPath(rootDir);

  return {
    catalogJsonPath,
    catalogMarkdownPath,
    changesDir,
    changesIndexJsonPath: path.join(openapiRoot, 'changes.json'),
    changesIndexMarkdownPath: path.join(openapiRoot, 'changes.md'),
    historyDir,
    openapiRoot,
    sourcePath,
  };
}

function resolveCatalogHistoryPaths(historyDir, historyFileName) {
  return {
    historyJsonPath: path.join(historyDir, `${historyFileName}.json`),
    historyMarkdownPath: path.join(historyDir, `${historyFileName}.md`),
  };
}

function resolveGenerateCommandPaths(rootDir, projectConfig) {
  const sourcePath = resolveOpenApiSourcePath(rootDir, projectConfig);
  const docsDir = path.resolve(rootDir, projectConfig.docsDir);
  const generatedSchemaPath = resolveGeneratedSchemaPath(rootDir, projectConfig);

  return {
    docsDir,
    generatedSchemaPath,
    legacyEndpointsDir: projectConfig.endpointsDir
      ? path.resolve(rootDir, projectConfig.endpointsDir)
      : null,
    reviewGeneratedDir: path.dirname(generatedSchemaPath),
    sourceFileUrl: pathToFileURL(sourcePath),
    sourcePath,
  };
}

function resolveEndpointDocPath(docsDir, endpointId) {
  return path.join(docsDir, `${endpointId}.md`);
}

function resolveProjectOutputPaths(rootDir, projectConfig) {
  const projectGeneratedSrcDir = path.resolve(rootDir, projectConfig.projectGeneratedSrcDir);
  const projectRootDir = path.resolve(projectGeneratedSrcDir, '..', '..');

  return {
    projectGeneratedSrcDir,
    projectManifestPath: path.join(projectRootDir, 'manifest.json'),
    projectSummaryPath: path.join(projectRootDir, 'summary.md'),
  };
}

export {
  resolveCatalogCommandPaths,
  resolveCatalogHistoryPaths,
  resolveEndpointDocPath,
  resolveGenerateCommandPaths,
  resolveProjectOutputPaths,
};
