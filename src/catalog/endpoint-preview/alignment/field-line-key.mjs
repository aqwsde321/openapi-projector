import {
  parseEndpointPreviewFieldName,
} from './line-parser.mjs';

function getEndpointPreviewFieldLineKey(text, trimmed, state) {
  const fieldName = parseEndpointPreviewFieldName(trimmed);
  if (!fieldName) {
    return null;
  }

  if (state.group === `${state.section}.headers`) {
    state.fieldScope = `${state.section}.header.${fieldName}`;
  }

  const isNestedField = text.startsWith('    ') && state.fieldScope;
  const group = isNestedField
    ? `${state.fieldScope}.fields`
    : state.fieldsGroup ?? state.group ?? `${state.section}.line`;

  if (!isNestedField && group.endsWith('.fields')) {
    state.fieldScope = `${group.replace(/\.fields$/u, '')}.${fieldName}`;
  }

  return `${group}.${fieldName}`;
}

export { getEndpointPreviewFieldLineKey };
