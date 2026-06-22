import { withNullable } from './type-utils.mjs';

function renderCompositeSchemaType(schema, renderType) {
  if (schema.oneOf) {
    return withNullable(schema, schema.oneOf.map((item) => renderType(item)).join(' | '));
  }

  if (schema.anyOf) {
    return withNullable(schema, schema.anyOf.map((item) => renderType(item)).join(' | '));
  }

  if (schema.allOf) {
    return withNullable(schema, schema.allOf.map((item) => renderType(item)).join(' & '));
  }

  return null;
}

function renderEnumSchemaType(schema) {
  if (!schema.enum) {
    return null;
  }

  const literals = schema.enum.map((item) => JSON.stringify(item));
  return withNullable(schema, literals.join(' | '));
}

export {
  renderCompositeSchemaType,
  renderEnumSchemaType,
};
