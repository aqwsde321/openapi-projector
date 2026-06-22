import { schemaRefName } from '#src/openapi/refs.mjs';
import { formatEnumTypeLabel } from '../enum-values/index.mjs';

function getAddedOrRemovedDetailValue(detail) {
  if (detail?.kind === 'added') {
    return detail.next;
  }
  if (detail?.kind === 'removed') {
    return detail.previous;
  }

  return undefined;
}

function isAddedOrRemovedDetail(detail) {
  return detail?.kind === 'added' || detail?.kind === 'removed';
}

function formatSchemaTypeLabel(values, options = {}) {
  const fieldPrefix = options.fieldPrefix ?? '';
  const fieldPath = (fieldName) => (fieldPrefix ? `${fieldPrefix}.${fieldName}` : fieldName);

  if (values.has(fieldPath('$ref'))) {
    return schemaRefName(values.get(fieldPath('$ref')));
  }

  if (values.has(fieldPath('enum'))) {
    return formatEnumTypeLabel(values.get(fieldPath('enum')));
  }

  if (values.get(fieldPath('type')) === 'array') {
    if (values.has(fieldPath('items.$ref'))) {
      return `${schemaRefName(values.get(fieldPath('items.$ref')))}[]`;
    }

    if (values.has(fieldPath('items.type'))) {
      return `${values.get(fieldPath('items.type'))}[]`;
    }
  }

  if (options.includeCompositionTypes === true) {
    for (const compositionType of ['oneOf', 'anyOf', 'allOf']) {
      if (values.has(fieldPath(compositionType))) {
        return compositionType;
      }
    }
  }

  return values.get(fieldPath('type')) ?? 'unknown';
}

export {
  formatSchemaTypeLabel,
  getAddedOrRemovedDetailValue,
  isAddedOrRemovedDetail,
};
