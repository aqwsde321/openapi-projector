import { quotePropertyName } from './type-utils.mjs';

function renderObjectType(schema, renderType) {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const lines = ['{'];

  for (const [propName, propSchema] of Object.entries(properties)) {
    const optionalFlag = required.has(propName) ? '' : '?';
    lines.push(
      `  ${quotePropertyName(propName)}${optionalFlag}: ${renderType(propSchema)};`,
    );
  }

  if (schema.additionalProperties) {
    lines.push(
      `  [key: string]: ${renderType(schema.additionalProperties)};`,
    );
  }

  if (lines.length === 1) {
    lines.push('  [key: string]: unknown;');
  }

  lines.push('}');
  return lines.join('\n');
}

export { renderObjectType };
