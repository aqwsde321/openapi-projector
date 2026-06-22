import {
  isNullablePreviewSchema,
  javaTypeFromSchema,
} from '../../schema-java-types.mjs';
import { schemaRefName } from '#src/openapi/refs.mjs';
import {
  getPreviewSchemaRefName,
  resolvePreviewSchemaForFields,
} from './schema-resolver.mjs';

function formatPreviewFieldDeclaration(name, schema, required, referencedSchemas, options = {}) {
  const type = javaTypeFromPreviewSchema(schema, referencedSchemas) ?? 'Object';
  const flags = options.includeRequiredFlag === false
    ? []
    : [required ? 'required' : 'optional'];

  if (isNullablePreviewSchema(schema)) {
    flags.push('nullable');
  }

  return flags.length > 0 ? `${name}: ${type} (${flags.join(', ')})` : `${name}: ${type}`;
}

function formatPreviewSchemaLabel(schema) {
  if (!schema || typeof schema !== 'object') {
    return 'unknown';
  }

  if (typeof schema.$ref === 'string') {
    return schemaRefName(schema.$ref);
  }

  if (schema.type === 'array') {
    return `List<${formatPreviewSchemaLabel(schema.items)}>`;
  }

  return javaTypeFromSchema(schema) ?? 'unknown';
}

function javaTypeFromPreviewSchema(schema, referencedSchemas) {
  if (!schema || typeof schema !== 'object') {
    return null;
  }

  if (schema.type === 'array') {
    return `List<${javaTypeFromPreviewSchema(schema.items, referencedSchemas) ?? 'Object'}>`;
  }

  return javaTypeFromSchema(schema) ?? formatPreviewSchemaLabel(schema);
}

export {
  formatPreviewFieldDeclaration,
  formatPreviewSchemaLabel,
  getPreviewSchemaRefName,
  resolvePreviewSchemaForFields,
};
