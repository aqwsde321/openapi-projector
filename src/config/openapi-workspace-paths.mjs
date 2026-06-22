import path from 'node:path';

export {
  resolveCatalogCommandPaths,
  resolveCatalogHistoryPaths,
  resolveEndpointDocPath,
  resolveGenerateCommandPaths,
  resolveProjectOutputPaths,
} from './openapi-command-paths.mjs';

const DEFAULT_GENERATED_SCHEMA_PATH = 'openapi/review/generated/schema.ts';
const DEFAULT_OPENAPI_GITIGNORE_PATH = 'openapi/.gitignore';
const DEFAULT_OPENAPI_README_PATH = 'openapi/README.md';
const DEFAULT_OPENAPI_ROOT_DIR = 'openapi';
const DEFAULT_OPENAPI_WORKSPACE_DIRS = [
  'openapi/review',
  'openapi/project',
  'openapi/_internal/source',
];

function resolveOpenApiRootPath(rootDir) {
  return path.resolve(rootDir, DEFAULT_OPENAPI_ROOT_DIR);
}

function resolveOpenApiWorkspacePaths(rootDir) {
  return {
    openapiGitignorePath: path.resolve(rootDir, DEFAULT_OPENAPI_GITIGNORE_PATH),
    projectReadmePath: path.resolve(rootDir, DEFAULT_OPENAPI_README_PATH),
    workspaceDirs: DEFAULT_OPENAPI_WORKSPACE_DIRS.map((dir) => path.resolve(rootDir, dir)),
  };
}

function resolveOpenApiSourcePath(rootDir, projectConfig) {
  return path.resolve(rootDir, projectConfig.sourcePath);
}

function resolveGeneratedSchemaPath(rootDir, projectConfig) {
  return path.resolve(
    rootDir,
    projectConfig.generatedSchemaPath ?? DEFAULT_GENERATED_SCHEMA_PATH,
  );
}

export {
  resolveGeneratedSchemaPath,
  resolveOpenApiRootPath,
  resolveOpenApiSourcePath,
  resolveOpenApiWorkspacePaths,
};
