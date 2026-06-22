import { schemaRefName } from '../../openapi/refs.mjs';
import { renderObjectType } from './object-type-renderer.mjs';
import {
  quotePropertyName,
  withNullable,
  wrapCompositeArrayItem,
} from './type-utils.mjs';
import { renderTypeArraySchemaType } from './type-array-renderer.mjs';
import {
  renderCompositeSchemaType,
  renderEnumSchemaType,
} from './type-union-renderer.mjs';

function createTypeRenderer(refFormatter) {
  const renderType = (schema) => {
    if (!schema) {
      return 'unknown';
    }

    if (schema.$ref) {
      return withNullable(schema, refFormatter(schemaRefName(schema.$ref)));
    }

    const compositeType = renderCompositeSchemaType(schema, renderType);
    if (compositeType !== null) {
      return compositeType;
    }

    const enumType = renderEnumSchemaType(schema);
    if (enumType !== null) {
      return enumType;
    }

    const typeArrayType = renderTypeArraySchemaType(schema, renderType);
    if (typeArrayType !== null) {
      return typeArrayType;
    }

    return withNullable(schema, renderBasicSchemaType(schema, renderType));
  };

  return { renderType };
}

function renderBasicSchemaType(schema, renderType) {
  if (schema.type === 'string' && schema.format === 'binary') {
    return 'File';
  }

  switch (schema.type) {
    case 'string':
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return `${wrapCompositeArrayItem(renderType(schema.items))}[]`;
    case 'object':
      return renderObjectType(schema, renderType);
    default:
      if (schema.properties || schema.additionalProperties) {
        return renderObjectType(schema, renderType);
      }
      return 'unknown';
  }
}

export {
  createTypeRenderer,
  quotePropertyName,
};
