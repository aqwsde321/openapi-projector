import { isPlainObject } from '../core/object-utils.mjs';

const SUPPORTED_PREFIXES = ['3.0', '3.1'];

function validateOpenApiRootShape(spec, sourcePath) {
  const issues = [];

  if (!isPlainObject(spec)) {
    issues.push('root must be a JSON object');
  } else {
    if (!isPlainObject(spec.info)) {
      issues.push('info must be an object');
    }

    if (!isPlainObject(spec.paths)) {
      issues.push('paths must be an object');
    }

    if (spec.components != null && !isPlainObject(spec.components)) {
      issues.push('components must be an object when present');
    }
  }

  if (issues.length > 0) {
    throw new Error(
      `OpenAPI source is invalid: ${issues.join('; ')}.\nSource: ${sourcePath}`,
    );
  }
}

function validateSupportedOpenApiSpec(spec, sourcePath) {
  if (!isPlainObject(spec)) {
    validateOpenApiRootShape(spec, sourcePath);
  }

  const version = spec.openapi;

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

  validateOpenApiRootShape(spec, sourcePath);
}

export { validateSupportedOpenApiSpec };
