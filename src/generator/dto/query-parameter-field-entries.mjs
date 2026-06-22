import {
  buildFlattenedQueryParameterEntries,
  canFlattenQueryObjectParameter,
  hasFlattenedFieldNameConflict,
} from './query-parameter-flattening.mjs';

function buildQueryParameterFieldEntries({
  buildFieldEntriesFromSchema,
  isSimpleObjectSchema,
  parameter,
  resolveSchema,
  spec,
  usedNames,
}) {
  if (
    !spec ||
    !resolveSchema ||
    !isSimpleObjectSchema ||
    !canFlattenQueryObjectParameter(spec, parameter, resolveSchema, isSimpleObjectSchema)
  ) {
    return null;
  }

  const flattenedEntries = buildFlattenedQueryParameterEntries(
    spec,
    parameter,
    resolveSchema,
    buildFieldEntriesFromSchema,
  );

  return hasFlattenedFieldNameConflict(flattenedEntries, usedNames)
    ? null
    : flattenedEntries;
}

function appendFlattenedQueryParameterEntries({
  buildFieldEntriesFromSchema,
  entries,
  isSimpleObjectSchema,
  parameter,
  resolveSchema,
  spec,
  usedNames,
}) {
  const flattenedEntries = buildQueryParameterFieldEntries({
    buildFieldEntriesFromSchema,
    isSimpleObjectSchema,
    parameter,
    resolveSchema,
    spec,
    usedNames,
  });

  if (!flattenedEntries) {
    return false;
  }

  for (const entry of flattenedEntries) {
    entries.push(entry);
    usedNames.add(String(entry.name));
  }

  return true;
}

export { appendFlattenedQueryParameterEntries };
