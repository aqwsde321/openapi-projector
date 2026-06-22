import { isPlainObject } from '../core/object-utils.mjs';

function validateOpenApiJson(value) {
  if (!isPlainObject(value)) {
    return 'root is not a JSON object';
  }

  if (value.swagger === '2.0') {
    return 'Swagger/OpenAPI 2.0 is not supported';
  }

  const version = value.openapi;
  if (!version || !['3.0', '3.1'].some((prefix) => String(version).startsWith(prefix))) {
    return `not OpenAPI 3.0/3.1 JSON (detected: ${version ?? 'unknown'})`;
  }

  if (!isPlainObject(value.info)) {
    return 'info is not an object';
  }

  if (!isPlainObject(value.paths)) {
    return 'paths is not an object';
  }

  return null;
}

export { validateOpenApiJson };
