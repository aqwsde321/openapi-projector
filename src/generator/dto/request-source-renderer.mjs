import {
  appendInterfaceFields,
  buildJsDoc,
} from './interface-renderer.mjs';

function renderInlineRequestDtoSource({
  name,
  description,
  fields,
  renderer,
}) {
  const lines = [...buildJsDoc(description), `export interface ${name} {`];

  appendInterfaceFields(lines, fields, renderer);
  lines.push('}');
  return lines.join('\n');
}

function renderNestedRequestDtoSource({
  name,
  description,
  pathFields,
  queryFields,
  headerFields,
  cookieFields,
  bodyTypeName,
  hasRequestBody,
  bodyRequired,
  renderer,
}) {
  const lines = [...buildJsDoc(description), `export interface ${name} {`];

  const groups = [
    ['pathParams', 'path parameters', pathFields, true],
    ['params', 'query parameters', queryFields, false],
    ['headers', 'header parameters', headerFields, false],
    ['cookies', 'cookie parameters', cookieFields, false],
  ];

  for (const [propertyName, label, fields, required] of groups) {
    if (fields.length === 0) {
      continue;
    }

    lines.push(...buildJsDoc(label, '  '));
    lines.push(`  ${propertyName}${required ? '' : '?'}: {`);
    appendInterfaceFields(lines, fields, renderer, '    ');
    lines.push('  };');
  }

  if (hasRequestBody && bodyTypeName) {
    lines.push(...buildJsDoc('request body', '  '));
    lines.push(`  data${bodyRequired ? '' : '?'}: ${bodyTypeName};`);
  }

  lines.push('}');
  return lines.join('\n');
}

export {
  renderInlineRequestDtoSource,
  renderNestedRequestDtoSource,
};
