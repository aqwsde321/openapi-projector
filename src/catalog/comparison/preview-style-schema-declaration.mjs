import {
  isNullablePreviewSchema,
  javaTypeFromSchema,
} from '../schema-java-types.mjs';
import {
  formatEnumValues,
  getSchemaEnumValues,
} from './enum-values/index.mjs';

function formatPreviewStyleSchemaDeclaration(
  name,
  schema,
  required,
  options = {},
) {
  const type = javaTypeFromSchema(schema) ?? 'Object';
  const flags =
    options.includeRequiredFlag === false
      ? []
      : [required ? 'required' : 'optional'];
  const enumValues = getSchemaEnumValues(schema);

  if (isNullablePreviewSchema(schema)) {
    flags.push('nullable');
  }
  if (enumValues.length > 0) {
    flags.push(`enum: ${formatEnumValues(enumValues)}`);
  }

  return flags.length > 0
    ? `${name}: ${type} (${flags.join(', ')})`
    : `${name}: ${type}`;
}

export { formatPreviewStyleSchemaDeclaration };
