function formatSchemaDocumentationPathLabel(pathSegments, fieldLabel) {
  const schemaName = pathSegments[1] ?? 'Unknown';
  const propertyPath = extractSchemaPropertyPath(pathSegments.slice(2, -1));
  const schemaTarget = propertyPath ? `${schemaName}.${propertyPath}` : schemaName;
  return `Schema ${schemaTarget} ${fieldLabel}`;
}

function extractSchemaPropertyPath(pathSegments) {
  const properties = [];

  for (let index = 0; index < pathSegments.length; index += 1) {
    if (pathSegments[index] === 'properties' && pathSegments[index + 1]) {
      properties.push(pathSegments[index + 1]);
      index += 1;
    }
  }

  return properties.join('.');
}

export { formatSchemaDocumentationPathLabel };
