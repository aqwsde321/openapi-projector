import {
  getByRef,
} from '../../openapi/refs.mjs';

function isSimpleObjectSchema(schema) {
  const schemaTypes = Array.isArray(schema?.type) ? schema.type : [schema?.type];
  const isNullable = Boolean(schema?.nullable || schemaTypes.includes('null'));

  return Boolean(
    schema &&
      !isNullable &&
      (schema.type === 'object' || schema.properties || schema.additionalProperties) &&
      !schema.oneOf &&
      !schema.anyOf &&
      !schema.allOf &&
      !schema.enum,
  );
}

function resolveSchema(spec, schema) {
  if (!schema) {
    return null;
  }

  return schema.$ref ? getByRef(spec, schema.$ref) : schema;
}

export {
  isSimpleObjectSchema,
  resolveSchema,
};
