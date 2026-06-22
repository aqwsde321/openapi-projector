function canFlattenQueryObjectParameter(spec, parameter, resolveSchema, isSimpleObjectSchema) {
  if (parameter?.in !== 'query') {
    return false;
  }

  if (parameter.style && parameter.style !== 'form') {
    return false;
  }

  if (parameter.explode === false) {
    return false;
  }

  return isSimpleObjectSchema(resolveSchema(spec, parameter.schema));
}

function buildFlattenedQueryParameterEntries(
  spec,
  parameter,
  resolveSchema,
  buildFieldEntriesFromSchema,
) {
  const schema = resolveSchema(spec, parameter.schema);

  return buildFieldEntriesFromSchema(schema).map((field) => ({
    ...field,
    required: Boolean(parameter.required && field.required),
    description: field.description ?? parameter.description,
  }));
}

function hasFlattenedFieldNameConflict(flattenedEntries, usedNames) {
  const flattenedNames = flattenedEntries.map((entry) => String(entry.name));

  return (
    new Set(flattenedNames).size !== flattenedNames.length ||
    flattenedNames.some((name) => usedNames.has(name))
  );
}

export {
  buildFlattenedQueryParameterEntries,
  canFlattenQueryObjectParameter,
  hasFlattenedFieldNameConflict,
};
