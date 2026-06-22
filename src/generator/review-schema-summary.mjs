import { schemaRefName } from '../openapi/refs.mjs';
import {
  buildFieldEntriesFromSchema,
} from './dto/source-renderer.mjs';
import {
  isSimpleObjectSchema,
  resolveSchema,
} from './dto/schema-utils.mjs';
import { formatSchemaType } from './review-schema-type-format.mjs';

function summarizeFields(fields) {
  return fields.map((field) => ({
    name: field.name,
    required: Boolean(field.required),
    type: formatSchemaType(field.schema),
  }));
}

function summarizeSchemaObject(spec, schema) {
  if (!schema) {
    return {
      schema: null,
      shape: 'none',
      fields: [],
    };
  }

  const resolvedSchema = resolveSchema(spec, schema);
  const schemaName = schema.$ref ? schemaRefName(schema.$ref) : null;
  const shape = schemaName ?? formatSchemaType(resolvedSchema ?? schema);
  const fields =
    resolvedSchema && isSimpleObjectSchema(resolvedSchema)
      ? summarizeFields(buildFieldEntriesFromSchema(resolvedSchema))
      : [];

  return {
    schema: schemaName,
    shape,
    fields,
  };
}

export {
  summarizeFields,
  summarizeSchemaObject,
};
