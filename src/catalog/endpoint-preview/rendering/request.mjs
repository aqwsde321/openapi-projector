import {
  choosePreferredRequestMediaType,
} from '#src/openapi/media.mjs';
import { appendPreviewSchemaFields } from './fields.mjs';
import {
  formatPreviewFieldDeclaration,
  formatPreviewSchemaLabel,
} from './schema.mjs';

const PREVIEW_PARAMETER_GROUPS = [
  { label: 'Path Parameters', location: 'path' },
  { label: 'Query Parameters', location: 'query' },
  { label: 'Header Parameters', location: 'header' },
  { label: 'Cookie Parameters', location: 'cookie' },
];

function renderPreviewRequestLines(snapshot) {
  const operation = snapshot?.operation ?? {};
  const referencedSchemas = snapshot?.referencedSchemas ?? {};
  const lines = ['요청'];
  const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];

  appendPreviewParameterGroups(lines, parameters, referencedSchemas);

  const requestBody = operation.requestBody;
  if (!requestBody) {
    lines.push('- Body: 없음');
    return lines;
  }

  const content = requestBody.content ?? {};
  const mediaType = choosePreferredRequestMediaType(Object.keys(content))
    ?? Object.keys(content)[0]
    ?? null;
  const schema = mediaType ? content[mediaType]?.schema : null;
  lines.push(`- Body: ${schema ? formatPreviewSchemaLabel(schema) : 'unknown'}`);
  if (mediaType && mediaType !== '*/*') {
    lines.push(`- Content-Type: ${mediaType}`);
  }
  appendPreviewSchemaFields(lines, schema, referencedSchemas);

  return lines;
}

function appendPreviewParameterGroups(lines, parameters, referencedSchemas) {
  for (const { label, location } of PREVIEW_PARAMETER_GROUPS) {
    appendPreviewParameterGroup(
      lines,
      label,
      parameters.filter((parameter) => parameter?.in === location),
      referencedSchemas,
    );
  }
}

function appendPreviewParameterGroup(lines, label, parameters, referencedSchemas) {
  if (parameters.length === 0) {
    return;
  }

  lines.push(`- ${label}`);
  for (const parameter of parameters) {
    lines.push(
      `  - ${formatPreviewFieldDeclaration(
        parameter.name,
        parameter.schema,
        Boolean(parameter.required),
        referencedSchemas,
      )}`,
    );
  }
}

export { renderPreviewRequestLines };
