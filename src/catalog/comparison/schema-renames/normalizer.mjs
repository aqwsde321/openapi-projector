import { schemaRefName } from '#src/openapi/refs.mjs';
import { isPlainObject } from '../../diff-utils/value-types.mjs';

function normalizeRenamedSchemaRefs(value, schemaRenames = new Map()) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeRenamedSchemaRefs(item, schemaRenames));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  if (typeof value.$ref === 'string') {
    const refName = schemaRefName(value.$ref);
    const renamedRefName = schemaRenames.get(refName);

    if (renamedRefName) {
      return {
        ...value,
        $ref: value.$ref.replace(/[^/]+$/u, renamedRefName),
      };
    }
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      normalizeRenamedSchemaRefs(child, schemaRenames),
    ]),
  );
}

export { normalizeRenamedSchemaRefs };
