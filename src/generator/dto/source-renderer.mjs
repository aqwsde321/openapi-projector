import {
  buildFieldEntriesFromParameters as buildFieldEntriesFromParametersBase,
  buildFieldEntriesFromSchema,
  hasDuplicateFieldNames,
} from './field-entries.mjs';
import {
  appendInterfaceFields,
  buildJsDoc,
} from './interface-renderer.mjs';
import {
  renderInlineRequestDtoSource,
  renderNestedRequestDtoSource,
} from './request-source-renderer.mjs';
import {
  isSimpleObjectSchema,
  resolveSchema,
} from './schema-utils.mjs';
import {
  createTypeRenderer,
  quotePropertyName,
} from './type-renderer.mjs';

function buildFieldEntriesFromParameters(parameters, location, options = {}) {
  return buildFieldEntriesFromParametersBase(parameters, location, {
    ...options,
    isSimpleObjectSchema,
    resolveSchema,
  });
}

function renderConcreteNamedSchema(name, schema, renderer, description) {
  const lines = [...buildJsDoc(description)];

  if (isSimpleObjectSchema(schema)) {
    const properties = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    lines.push(`export interface ${name} {`);
    appendInterfaceFields(
      lines,
      Object.entries(properties).map(([propName, propSchema]) => ({
        name: propName,
        required: required.has(propName),
        schema: propSchema,
        description: propSchema.description,
      })),
      renderer,
    );

    if (schema.additionalProperties) {
      lines.push(`  [key: string]: ${renderer.renderType(schema.additionalProperties)};`);
    }

    if (Object.keys(properties).length === 0 && !schema.additionalProperties) {
      lines.push('  [key: string]: unknown;');
    }

    lines.push('}');
    return lines.join('\n');
  }

  lines.push(`export type ${name} = ${renderer.renderType(schema)};`);
  return lines.join('\n');
}

export {
  buildFieldEntriesFromParameters,
  buildFieldEntriesFromSchema,
  createTypeRenderer,
  hasDuplicateFieldNames,
  isSimpleObjectSchema,
  quotePropertyName,
  renderConcreteNamedSchema,
  renderInlineRequestDtoSource,
  renderNestedRequestDtoSource,
  resolveSchema,
};
