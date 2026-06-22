import { parseFormattedPath } from '../../format/path.mjs';

function stripSchemaTargetMetadata(target) {
  return target.replace(/(\.(required|type|format|nullable|enum|items))+$/u, '');
}

function parseReferencedSchemaName(detailPath) {
  return parseReferencedSchemaTarget(detailPath)?.schemaName ?? null;
}

function parseReferencedSchemaTarget(detailPath) {
  const segments = parseFormattedPath(detailPath);
  if (segments[0] !== 'referencedSchemas' || !segments[1]) {
    return null;
  }

  return {
    schemaName: segments[1],
    propertyName: segments[2] === 'properties' ? segments[3] : null,
    fieldPath: segments[2] === 'properties'
      ? segments.slice(4).join('.')
      : segments.slice(2).join('.'),
  };
}

function parseSchemaPropertyDetailPath(detailPath) {
  const segments = parseFormattedPath(detailPath);

  if (
    segments[0] !== 'referencedSchemas' ||
    !segments[1] ||
    segments[2] !== 'properties' ||
    !segments[3] ||
    segments.length < 5
  ) {
    return null;
  }

  return {
    schemaName: segments[1],
    propertyName: segments[3],
    fieldPath: segments.slice(4).join('.'),
  };
}

function parseSchemaRequiredDetailPath(detailPath) {
  const segments = parseFormattedPath(detailPath);

  if (segments[0] !== 'referencedSchemas' || !segments[1] || segments[2] !== 'required') {
    return null;
  }

  return {
    schemaName: segments[1],
  };
}

export {
  parseReferencedSchemaName,
  parseReferencedSchemaTarget,
  parseSchemaPropertyDetailPath,
  parseSchemaRequiredDetailPath,
  stripSchemaTargetMetadata,
};
