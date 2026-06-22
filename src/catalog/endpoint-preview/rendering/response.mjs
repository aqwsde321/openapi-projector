import {
  choosePreferredResponseMediaType,
  findPrimaryResponse,
} from '#src/openapi/media.mjs';
import {
  appendPreviewSchemaFields,
  buildPreviewSchemaFields,
} from './fields.mjs';
import {
  formatPreviewFieldDeclaration,
  formatPreviewSchemaLabel,
} from './schema.mjs';

function renderPreviewResponseLines(snapshot) {
  const operation = snapshot?.operation ?? {};
  const referencedSchemas = snapshot?.referencedSchemas ?? {};
  const lines = ['응답'];
  const [status, response] = findPrimaryResponse(operation.responses ?? {});

  if (!response) {
    lines.push('- 없음');
    return lines;
  }

  const content = response.content ?? {};
  const mediaType = choosePreferredResponseMediaType(Object.keys(content))
    ?? Object.keys(content)[0]
    ?? null;
  const schema = mediaType ? content[mediaType]?.schema : null;
  const statusLabel = status ?? 'default';
  const mediaLabel = mediaType && mediaType !== '*/*' ? ` ${mediaType}` : '';
  lines.push(`- ${statusLabel}${mediaLabel}: ${schema ? formatPreviewSchemaLabel(schema) : 'body 없음'}`);
  appendPreviewSchemaFields(lines, schema, referencedSchemas, {
    includeRequiredFlag: false,
  });
  appendPreviewHeaders(lines, response.headers ?? {}, referencedSchemas);

  return lines;
}

function appendPreviewHeaders(lines, headers, referencedSchemas) {
  const entries = Object.entries(headers ?? {});
  if (entries.length === 0) {
    return;
  }

  lines.push('- Headers');
  for (const [name, header] of entries) {
    const content = header?.content ?? {};
    const mediaType = choosePreferredResponseMediaType(Object.keys(content))
      ?? Object.keys(content)[0]
      ?? null;
    const schema = header?.schema ?? (mediaType ? content[mediaType]?.schema : null);
    lines.push(
      `  - ${formatPreviewFieldDeclaration(
        name,
        schema,
        Boolean(header?.required),
        referencedSchemas,
      )}`,
    );
    const fields = buildPreviewSchemaFields(schema, referencedSchemas);
    if (fields.length > 0) {
      lines.push('    - 필드');
      for (const field of fields) {
        lines.push(`      - ${field}`);
      }
    }
  }
}

export { renderPreviewResponseLines };
