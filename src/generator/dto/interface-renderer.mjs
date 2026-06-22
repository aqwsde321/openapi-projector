import {
  escapeComment,
  normalizeText,
} from '../../core/text-utils.mjs';
import { quotePropertyName } from './type-renderer.mjs';

function buildJsDoc(description, indent = '') {
  const text = normalizeText(description);
  if (!text) {
    return [];
  }

  return [
    `${indent}/**`,
    ...text.split('\n').map((line) => `${indent} * ${escapeComment(line)}`),
    `${indent} */`,
  ];
}

function appendInterfaceFields(lines, fields, renderer, indent = '  ') {
  for (const field of fields) {
    lines.push(...buildJsDoc(field.description, indent));
    lines.push(renderInterfaceFieldLine(field, renderer, indent));
  }
}

function renderInterfaceFieldLine(field, renderer, indent = '  ') {
  return `${indent}${quotePropertyName(field.name)}${field.required ? '' : '?'}: ${renderer.renderType(
    field.schema,
  )};`;
}

export {
  appendInterfaceFields,
  buildJsDoc,
};
