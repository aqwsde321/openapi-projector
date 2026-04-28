function isJsonLikeMediaType(mediaType) {
  return (
    mediaType === 'application/json' ||
    mediaType === '*/*' ||
    (typeof mediaType === 'string' && mediaType.endsWith('+json'))
  );
}

function isMultipartMediaType(mediaType) {
  return mediaType === 'multipart/form-data';
}

function classifyProjectOperations(operations) {
  const supportedOperations = [];
  const skippedOperations = [];

  for (const operation of operations) {
    const unsupportedReasons = [];

    if (operation.requestContentTypes.length > 1) {
      unsupportedReasons.push('multiple request body media types');
    } else if (
      operation.requestContentTypes.length === 1 &&
      !isJsonLikeMediaType(operation.requestContentTypes[0]) &&
      !isMultipartMediaType(operation.requestContentTypes[0])
    ) {
      unsupportedReasons.push(
        `request media type ${operation.requestContentTypes[0]}`,
      );
    }

    if (!operation.successStatus) {
      unsupportedReasons.push('missing success response');
    }

    if (operation.responseContentTypes.length > 1) {
      unsupportedReasons.push('multiple response media types');
    } else if (
      operation.responseContentTypes.length === 1 &&
      !isJsonLikeMediaType(operation.responseContentTypes[0])
    ) {
      unsupportedReasons.push(
        `response media type ${operation.responseContentTypes[0]}`,
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
