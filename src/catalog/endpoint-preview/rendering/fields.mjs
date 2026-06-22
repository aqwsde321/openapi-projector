import {
  formatPreviewFieldDeclaration,
  getPreviewSchemaRefName,
  resolvePreviewSchemaForFields,
} from './schema.mjs';

function appendPreviewSchemaFields(lines, schema, referencedSchemas, options = {}) {
  const fields = buildPreviewSchemaFieldEntries(schema, referencedSchemas, options);
  if (fields.length === 0) {
    return;
  }

  lines.push('- 필드');
  for (const field of fields) {
    lines.push(`${'  '.repeat(field.depth + 1)}- ${field.declaration}`);
  }
}

function buildPreviewSchemaFields(schema, referencedSchemas) {
  return buildPreviewSchemaFieldEntries(schema, referencedSchemas).map(
    (field) => field.declaration,
  );
}

function buildPreviewSchemaFieldEntries(
  schema,
  referencedSchemas,
  options = {},
  depth = 0,
  seenRefs = new Set(),
) {
  if (depth > 1) {
    return [];
  }

  const resolvedSchema = resolvePreviewSchemaForFields(schema, referencedSchemas);
  const properties = resolvedSchema?.properties ?? {};
  const required = new Set(resolvedSchema?.required ?? []);

  return Object.entries(properties).flatMap(([name, propertySchema]) => {
    const declaration = formatPreviewFieldDeclaration(
      name,
      propertySchema,
      required.has(name),
      referencedSchemas,
      options,
    );
    const nestedSchema = resolvePreviewSchemaForFields(propertySchema, referencedSchemas);
    const refName = getPreviewSchemaRefName(propertySchema);
    const nextSeenRefs = refName ? new Set([...seenRefs, refName]) : seenRefs;
    const nestedFields =
      refName && seenRefs.has(refName)
        ? []
        : buildPreviewSchemaFieldEntries(
            nestedSchema,
            referencedSchemas,
            options,
            depth + 1,
            nextSeenRefs,
          );

    return [
      {
        depth,
        declaration,
      },
      ...nestedFields,
    ];
  });
}

export {
  appendPreviewSchemaFields,
  buildPreviewSchemaFields,
};
