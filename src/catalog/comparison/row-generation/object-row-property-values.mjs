import { formatInlineCode } from '../../format/inline.mjs';
import { schemaRefName } from '#src/openapi/refs.mjs';
import { formatSchemaTypeLabel } from './object-row-values.mjs';

function getReferencedSchemaNames(values) {
  const refs = [];

  if (values.has('$ref')) {
    refs.push(schemaRefName(values.get('$ref')));
  }

  if (values.has('items.$ref')) {
    refs.push(schemaRefName(values.get('items.$ref')));
  }

  return refs.filter(Boolean);
}

function hasSchemaPropertyTypeEvidence(values) {
  return (
    values.has('$ref') ||
    values.has('type') ||
    values.has('enum') ||
    values.has('items.$ref') ||
    values.has('items.type') ||
    values.has('oneOf') ||
    values.has('anyOf') ||
    values.has('allOf')
  );
}

function formatSchemaPropertySummary(values) {
  const parts = [
    formatInlineCode(
      formatSchemaTypeLabel(values, { includeCompositionTypes: true }),
    ),
  ];

  if (values.has('format')) {
    parts.push(`format=${formatInlineCode(values.get('format'))}`);
  }

  if (values.get('nullable') === true) {
    parts.push('nullable');
  }

  return parts.join(', ');
}

export {
  formatSchemaPropertySummary,
  getReferencedSchemaNames,
  hasSchemaPropertyTypeEvidence,
};
