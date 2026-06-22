import { schemaRefName } from '../openapi/refs.mjs';
import { javaTypeFromOpenApiType } from './schema-java-scalar-types.mjs';

function javaTypeFromSchema(schema) {
  if (!schema || typeof schema !== 'object') {
    return null;
  }

  if (typeof schema.$ref === 'string') {
    return schemaRefName(schema.$ref);
  }

  if (schema.type === 'array') {
    return `List<${javaTypeFromSchema(schema.items) ?? 'Object'}>`;
  }

  if (Array.isArray(schema.enum)) {
    return 'String';
  }

  const schemaTypes = Array.isArray(schema.type)
    ? schema.type.filter((type) => type !== 'null')
    : [schema.type];
  const type = schemaTypes[0];

  return javaTypeFromOpenApiType(type, schema.format);
}

function isNullablePreviewSchema(schema) {
  return Boolean(
    schema?.nullable ||
      (Array.isArray(schema?.type) && schema.type.includes('null')),
  );
}

export {
  isNullablePreviewSchema,
  javaTypeFromOpenApiType,
  javaTypeFromSchema,
};
