function buildSchemaUsageLabels(usages) {
  const hasRequestBody = usages.has('Request Body');
  const hasResponseBody = usages.has('Response Body');
  const hasRequestHeader = usages.has('Request Header');
  const hasResponseHeader = usages.has('Response Header');
  const parameterUsages = [...usages].filter((usage) =>
    usage.endsWith(' Parameter')
  );
  const labels = [];

  if (hasRequestBody && hasResponseBody) {
    labels.push('Request/Response Body');
  } else if (hasRequestBody) {
    labels.push('Request Body');
  } else if (hasResponseBody) {
    labels.push('Response Body');
  }

  if (hasRequestHeader && hasResponseHeader) {
    labels.push('Request/Response Header');
  } else if (hasRequestHeader) {
    labels.push('Request Header');
  } else if (hasResponseHeader) {
    labels.push('Response Header');
  }

  if (parameterUsages.length === 1) {
    labels.push(parameterUsages[0]);
  } else if (parameterUsages.length > 1) {
    labels.push('Parameter');
  }

  return labels;
}

function compactSchemaUsageLabels(labels) {
  if (labels.includes('Request Body') && labels.includes('Request Header')) {
    return [
      'Request Body/Header',
      ...labels.filter(
        (label) => label !== 'Request Body' && label !== 'Request Header',
      ),
    ];
  }

  if (labels.includes('Response Body') && labels.includes('Response Header')) {
    return [
      'Response Body/Header',
      ...labels.filter(
        (label) => label !== 'Response Body' && label !== 'Response Header',
      ),
    ];
  }

  return labels;
}

export {
  buildSchemaUsageLabels,
  compactSchemaUsageLabels,
};
