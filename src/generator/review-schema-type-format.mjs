import { schemaRefName } from '../openapi/refs.mjs';

function formatSchemaType(schema) {
  if (!schema) {
    return 'unknown';
  }

  const renderNullable = (baseType) => {
    const members = baseType.split('|').map((part) => part.trim());
    if (!isSchemaNullable(schema) || members.includes('null')) {
      return baseType;
    }

    return `${baseType} | null`;
  };

  if (schema.$ref) {
    return renderNullable(schemaRefName(schema.$ref));
  }

  if (Array.isArray(schema.enum)) {
    return renderNullable(schema.enum.map((item) => JSON.stringify(item)).join(' | '));
  }

  const types = Array.isArray(schema.type) ? schema.type : [schema.type].filter(Boolean);
  const nonNullTypes = types.filter((type) => type !== 'null');
  let baseType = nonNullTypes.join(' | ');

  if (!baseType && schema.oneOf) {
    baseType = 'oneOf';
  } else if (!baseType && schema.anyOf) {
    baseType = 'anyOf';
  } else if (!baseType && schema.allOf) {
    baseType = 'allOf';
  } else if (!baseType) {
    baseType = 'unknown';
  }

  if (baseType === 'array' && schema.items) {
    baseType = `${formatSchemaType(schema.items)}[]`;
  }

  return renderNullable(baseType);
}

function isSchemaNullable(schema) {
  const types = Array.isArray(schema?.type) ? schema.type : [schema?.type].filter(Boolean);
  return Boolean(schema?.nullable || types.includes('null'));
}

export { formatSchemaType };
