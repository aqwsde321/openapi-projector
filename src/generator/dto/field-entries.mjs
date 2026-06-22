import { appendFlattenedQueryParameterEntries } from './query-parameter-field-entries.mjs';

function buildFieldEntriesFromSchema(schema) {
  const properties = schema?.properties ?? {};
  const required = new Set(schema?.required ?? []);

  return Object.entries(properties).map(([name, propertySchema]) => ({
    name,
    required: required.has(name),
    schema: propertySchema,
    description: propertySchema.description,
  }));
}

function buildFieldEntriesFromParameters(parameters, location, options = {}) {
  const {
    isSimpleObjectSchema,
    resolveSchema,
    spec = null,
    flattenObjectParameters = false,
  } = options;
  const entries = [];
  const usedNames = new Set();

  for (const parameter of parameters.filter((item) => item.in === location)) {
    if (
      flattenObjectParameters &&
      location === 'query' &&
      appendFlattenedQueryParameterEntries({
        buildFieldEntriesFromSchema,
        entries,
        isSimpleObjectSchema,
        parameter,
        resolveSchema,
        spec,
        usedNames,
      })
    ) {
      continue;
    }

    entries.push({
      name: parameter.name,
      required: parameter.required,
      schema: parameter.schema,
      description: parameter.description,
    });
    usedNames.add(String(parameter.name));
  }

  return entries;
}

function hasDuplicateFieldNames(entries) {
  const seen = new Set();

  for (const entry of entries) {
    const key = String(entry.name);
    if (seen.has(key)) {
      return true;
    }
    seen.add(key);
  }

  return false;
}

export {
  buildFieldEntriesFromParameters,
  buildFieldEntriesFromSchema,
  hasDuplicateFieldNames,
};
