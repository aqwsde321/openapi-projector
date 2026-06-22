function getEndpointPreviewGroupKey(trimmed) {
  return {
    '- Path Parameters': 'pathParameters',
    '- Query Parameters': 'queryParameters',
    '- Header Parameters': 'headerParameters',
    '- Cookie Parameters': 'cookieParameters',
    '- 필드': 'fields',
    '- Headers': 'headers',
  }[trimmed] ?? null;
}

function isEndpointPreviewGroupLine(line) {
  return Boolean(getEndpointPreviewGroupKey(String(line ?? '').trim()));
}

function parseEndpointPreviewFieldName(trimmed) {
  const match = trimmed.match(/^- ([^:;]+):/u);
  return match ? match[1].trim() : null;
}

export {
  getEndpointPreviewGroupKey,
  isEndpointPreviewGroupLine,
  parseEndpointPreviewFieldName,
};
