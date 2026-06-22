import {
  formatMedia,
  formatParams,
  formatSchemaBody,
} from './project-summary-application-format.mjs';

function renderEndpointApplicationReview(endpoint) {
  const files = [
    endpoint.generatedFiles.dto,
    endpoint.generatedFiles.api,
    endpoint.generatedFiles.hook,
  ].filter(Boolean);
  const lines = [
    `- \`${endpoint.method} ${endpoint.path}\` -> \`${endpoint.functionName}\``,
    `  - Files: ${files.map((file) => `\`${file}\``).join(', ')}`,
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

export { renderEndpointApplicationReview };
