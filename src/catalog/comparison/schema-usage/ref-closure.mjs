import { schemaRefName } from '#src/openapi/refs.mjs';

function collectReferencedSchemaClosure(
  value,
  referencedSchemas = {},
  seen = new Set(),
) {
  for (const schemaName of collectSchemaRefNames(value)) {
    if (!schemaName || seen.has(schemaName)) {
      continue;
    }

    seen.add(schemaName);
    collectReferencedSchemaClosure(
      referencedSchemas?.[schemaName],
      referencedSchemas,
      seen,
    );
  }

  return seen;
}

function collectSchemaRefNames(value, refs = new Set()) {
  if (!value || typeof value !== 'object') {
    return refs;
  }

  if (typeof value.$ref === 'string') {
    refs.add(schemaRefName(value.$ref));
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectSchemaRefNames(item, refs));
    return refs;
  }

  Object.values(value).forEach((item) => collectSchemaRefNames(item, refs));
  return refs;
}

export { collectReferencedSchemaClosure };
