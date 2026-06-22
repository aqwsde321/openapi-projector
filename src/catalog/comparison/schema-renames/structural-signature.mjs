import { schemaRefName } from '#src/openapi/refs.mjs';
import { stableStringify } from '../../diff-utils/stable-stringify.mjs';
import {
  isPlainObject,
  isScalarValue,
} from '../../diff-utils/value-types.mjs';

function schemaStructuralSignature(schemaName, schemas = {}) {
  return stableStringify(normalizeSchemaForSignature(schemas?.[schemaName], schemas, new Set()));
}

function normalizeSchemaForSignature(value, schemas = {}, seenRefs = new Set()) {
  if (Array.isArray(value)) {
    const values = value.map((item) => normalizeSchemaForSignature(item, schemas, seenRefs));
    return values.every(isScalarValue)
      ? [...values].sort((left, right) => String(left).localeCompare(String(right)))
      : values;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  if (typeof value.$ref === 'string') {
    const refName = schemaRefName(value.$ref);

    if (schemas?.[refName] && !seenRefs.has(refName)) {
      return normalizeSchemaForSignature(
        schemas[refName],
        schemas,
        new Set([...seenRefs, refName]),
      );
    }

    return { $ref: refName ? '__schema_ref__' : value.$ref };
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [
        key,
        normalizeSchemaForSignature(child, schemas, seenRefs),
      ]),
  );
}

export { schemaStructuralSignature };
