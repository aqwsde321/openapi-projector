import { schemaRefName } from '#src/openapi/refs.mjs';

function getPreviewSchemaRefName(schema) {
  if (!schema || typeof schema !== 'object') {
    return null;
  }

  if (typeof schema.$ref === 'string') {
    return schemaRefName(schema.$ref);
  }

  if (schema.type === 'array') {
    return getPreviewSchemaRefName(schema.items);
  }

  return null;
}

function resolvePreviewSchemaForFields(schema, referencedSchemas, seenRefs = new Set()) {
  if (!schema || typeof schema !== 'object') {
    return null;
  }

  if (typeof schema.$ref === 'string') {
    const refName = schemaRefName(schema.$ref);
    if (seenRefs.has(refName)) {
      return schema;
    }
    return resolvePreviewSchemaForFields(
      referencedSchemas?.[refName],
      referencedSchemas,
      new Set([...seenRefs, refName]),
    );
  }

  if (schema.type === 'array') {
    return resolvePreviewSchemaForFields(schema.items, referencedSchemas, seenRefs);
  }

  return schema;
}

export {
  getPreviewSchemaRefName,
  resolvePreviewSchemaForFields,
};
