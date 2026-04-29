function renderRuntimeImport(wrapper) {
  if (wrapper.importKind === 'default') {
    return `import fetchAPI from '${wrapper.importPath}'`;
  }

  if (wrapper.importSymbol === 'fetchAPI') {
    return `import { fetchAPI } from '${wrapper.importPath}'`;
  }

  return `import { ${wrapper.importSymbol} as fetchAPI } from '${wrapper.importPath}'`;
}

function formatMedia(value) {
  return value ? `\`${value}\`` : '`none`';
}

function formatFields(fields) {
  if (!fields || fields.length === 0) {
    return 'none';
  }

  const visibleFields = fields.slice(0, 8).map((field) => {
    const optionalMarker = field.required ? '' : '?';
    return `\`${field.name}${optionalMarker}: ${field.type}\``;
  });
  const hiddenCount = fields.length - visibleFields.length;

  return hiddenCount > 0
    ? `${visibleFields.join(', ')}, +${hiddenCount} more`
    : visibleFields.join(', ');
}

function formatParams(label, params) {
  if (!params || params.length === 0) {
    return null;
  }

  return `${label}: ${formatFields(params)}`;
}

function formatSchemaBody(body) {
  if (!body || body.shape === 'none') {
    return 'none';
  }

  const schemaLabel = body.schema ? `\`${body.schema}\`` : `\`${body.shape}\``;
  return `${schemaLabel}; fields: ${formatFields(body.fields)}`;
}

function renderEndpointApplicationReview(endpoint) {
  const lines = [
    `- \`${endpoint.method} ${endpoint.path}\` -> \`${endpoint.functionName}\``,
    `  - Files: \`${endpoint.generatedFiles.dto}\`, \`${endpoint.generatedFiles.api}\``,
  ];

  if (endpoint.request.dtoShape === 'none') {
    lines.push('  - Request: no request DTO');
  } else {
    const requestBodyLabel =
      endpoint.request.body?.shape === 'none'
        ? 'none'
        : endpoint.request.bodyRequired
          ? 'required'
          : 'optional';

    lines.push(
      `  - Request: \`${endpoint.requestDto}\` (${endpoint.request.dtoShape}); media ${formatMedia(endpoint.request.mediaType)}; body ${requestBodyLabel}`,
    );

    const params = [
      formatParams('path', endpoint.request.pathParams),
      formatParams('query', endpoint.request.queryParams),
      formatParams('headers', endpoint.request.headerParams),
      formatParams('cookies', endpoint.request.cookieParams),
    ].filter(Boolean);

    if (params.length > 0) {
      lines.push(`  - Request params: ${params.join('; ')}`);
    }

    lines.push(`  - Request body: ${formatSchemaBody(endpoint.request.body)}`);
  }

  lines.push(
    `  - Response: \`${endpoint.response.status ?? 'unknown'}\` ${formatMedia(endpoint.response.mediaType)} -> \`${endpoint.responseDto}\`; body ${formatSchemaBody(endpoint.response.body)}`,
  );

  return lines;
}

function renderProjectSummary(manifest) {
  const lines = [
    '# Project Candidate Summary',
    '',
    `- Generated at: ${manifest.generatedAt}`,
    `- Source OpenAPI: ${manifest.sourcePath}`,
    `- Project rules: ${manifest.projectRulesPath}`,
    `- Review schema: ${manifest.generatedSchemaPath}`,
    `- Total endpoints: ${manifest.totalEndpoints}`,
    `- Generated endpoints: ${manifest.generatedEndpoints}`,
    `- Skipped endpoints: ${manifest.skippedEndpoints}`,
    '',
    '## Generated Files',
    '',
  ];

  for (const entry of manifest.files) {
    lines.push(
      `- [${entry.kind}] \`${entry.generated}\`${entry.summary ? ` (${entry.summary})` : ''}`,
    );
  }

  if (manifest.applicationReview?.endpoints?.length > 0) {
    lines.push('');
    lines.push('## Application Review');
    lines.push('');
    lines.push('Use this section before copying generated candidates into the app.');
    lines.push('');
    lines.push('### Runtime Wrapper');
    lines.push('');
    lines.push(
      `- Import used by generated APIs: \`${renderRuntimeImport(manifest.applicationReview.runtimeWrapper)}\``,
    );
    lines.push(
      `- Call shape: \`${manifest.applicationReview.runtimeWrapper.callShape}\``,
    );

    for (const assumption of manifest.applicationReview.runtimeWrapper.assumptions) {
      lines.push(`- Check: ${assumption}`);
    }

    lines.push('');
    lines.push('### Endpoint Contracts');
    lines.push('');

    for (const endpoint of manifest.applicationReview.endpoints) {
      lines.push(...renderEndpointApplicationReview(endpoint));
    }
  }

  if (manifest.skippedOperations.length > 0) {
    lines.push('');
    lines.push('## Skipped Operations');
    lines.push('');

    for (const skippedOperation of manifest.skippedOperations) {
      lines.push(
        `- \`${skippedOperation.method} ${skippedOperation.path}\`: ${skippedOperation.reasons.join(', ')}`,
      );
    }
  }

  lines.push('');
  return lines.join('\n');
}

export { renderProjectSummary };
