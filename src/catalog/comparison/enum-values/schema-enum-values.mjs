import { stripMarkdownFormatting } from '../../format/inline.mjs';

function getSchemaEnumValues(schema) {
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  if (Array.isArray(schema.enum)) {
    return schema.enum;
  }

  if (schema.type === 'array' && Array.isArray(schema.items?.enum)) {
    return schema.items.enum;
  }

  return [];
}

function getSchemaEnumValuesForTarget(schema, target) {
  if (!schema || typeof schema !== 'object') {
    return null;
  }

  const normalizedTarget = stripMarkdownFormatting(target);
  if (
    normalizedTarget.endsWith('.items.enum') ||
    normalizedTarget.endsWith('.items')
  ) {
    return Array.isArray(schema.items?.enum) ? schema.items.enum : [];
  }

  const values = getSchemaEnumValues(schema);
  return values.length > 0 ? values : null;
}

export {
  getSchemaEnumValues,
  getSchemaEnumValuesForTarget,
};
