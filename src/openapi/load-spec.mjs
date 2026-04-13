import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { readJson } from '../core/openapi-utils.mjs';

const DEFAULT_GENERATED_SCHEMA_PATH = 'openapi/review/generated/schema.ts';
const SUPPORTED_PREFIXES = ['3.0', '3.1'];

async function loadSupportedOpenApiSpec(sourcePath) {
  let spec;

  try {
    spec = await readJson(sourcePath);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Only OpenAPI 3.0/3.1 JSON is supported in MVP v2.\nCould not parse JSON: ${sourcePath}`,
      );
    }

    throw error;
  }

  const version = spec?.openapi;

  if (spec?.swagger === '2.0') {
    throw new Error(
      `Swagger/OpenAPI 2.0 is not supported in MVP v2.\nSource: ${sourcePath}`,
    );
  }

  if (!version || !SUPPORTED_PREFIXES.some((prefix) => String(version).startsWith(prefix))) {
    throw new Error(
      `Only OpenAPI 3.0/3.1 JSON is supported in MVP v2.\nDetected version: ${version ?? 'unknown'}\nSource: ${sourcePath}`,
    );
  }

  return spec;
}

function resolveGeneratedSchemaPath(rootDir, projectConfig) {
  return path.resolve(
    rootDir,
    projectConfig.generatedSchemaPath ?? DEFAULT_GENERATED_SCHEMA_PATH,
  );
}

function resolveGeneratedSchemaFileUrl(rootDir, projectConfig) {
  return pathToFileURL(resolveGeneratedSchemaPath(rootDir, projectConfig));
}

function toFileUrl(filePath) {
  return pathToFileURL(filePath);
}

export {
  DEFAULT_GENERATED_SCHEMA_PATH,
  loadSupportedOpenApiSpec,
  resolveGeneratedSchemaFileUrl,
  resolveGeneratedSchemaPath,
  toFileUrl,
};
