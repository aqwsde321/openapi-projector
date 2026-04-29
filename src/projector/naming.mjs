import {
  normalizeText,
  toCamelCase,
} from '../core/openapi-utils.mjs';

function normalizeOperationNameSource(value) {
  const text = normalizeText(value);
  if (!text) {
    return '';
  }

  const withoutHttpVerbSuffix = text.replace(
    /Using(?:GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/i,
    '',
  );
  const withoutControllerPrefix = withoutHttpVerbSuffix.replace(
    /^[A-Za-z0-9]+Controller(?:[_-]|(?=[A-Z]))?/,
    '',
  );

  return withoutControllerPrefix || withoutHttpVerbSuffix || text;
}

function buildOperationSymbolBase(operation) {
  const fallback = normalizeOperationNameSource(operation.operationId) || operation.endpointId;
  return toCamelCase(fallback);
}

function createUniqueName(baseName, usedNames) {
  const normalizedBaseName = baseName || 'callApi';
  let candidate = normalizedBaseName;
  let suffix = 2;

  while (usedNames.has(candidate)) {
    candidate = `${normalizedBaseName}${suffix}`;
    suffix += 1;
  }

  usedNames.add(candidate);
  return candidate;
}

function toPascalIdentifier(value) {
  if (!value) {
    return 'CallApi';
  }

  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

export {
  buildOperationSymbolBase,
  createUniqueName,
  toPascalIdentifier,
};
