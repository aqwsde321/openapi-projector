import {
  choosePreferredRequestMediaType,
  choosePreferredResponseMediaType,
} from '../core/openapi-utils.mjs';

function formatUnsupportedMediaTypeReason(kind, mediaTypes) {
  if (mediaTypes.length === 1) {
    return `${kind} media type ${mediaTypes[0]}`;
  }

  return `${kind} media types ${mediaTypes.join(', ')}`;
}

function classifyProjectOperations(operations) {
  const supportedOperations = [];
  const skippedOperations = [];

  for (const operation of operations) {
    const unsupportedReasons = [];
    const requestContentTypes = operation.requestContentTypes ?? [];
    const responseContentTypes = operation.responseContentTypes ?? [];
    const requestMediaType = choosePreferredRequestMediaType(requestContentTypes);
    const responseMediaType = choosePreferredResponseMediaType(responseContentTypes);

    if (requestContentTypes.length > 0 && !requestMediaType) {
      unsupportedReasons.push(
        formatUnsupportedMediaTypeReason('request', requestContentTypes),
      );
    }

    if (!operation.successStatus) {
      unsupportedReasons.push('missing success response');
    }

    if (responseContentTypes.length > 0 && !responseMediaType) {
      unsupportedReasons.push(
        formatUnsupportedMediaTypeReason('response', responseContentTypes),
      );
    }

    if (unsupportedReasons.length > 0) {
      skippedOperations.push({
        method: operation.method.toUpperCase(),
        path: operation.path,
        reasons: unsupportedReasons,
      });
      continue;
    }

    supportedOperations.push(operation);
  }

  return {
    supportedOperations,
    skippedOperations,
  };
}

export { classifyProjectOperations };
