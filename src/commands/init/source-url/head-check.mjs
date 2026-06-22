import {
  createFetchSignal,
  describeFetchError,
  formatHttpResponseFailure,
  getResponseHeader,
  isJsonContentType,
} from '#src/openapi/source-url-utils.mjs';

async function checkJsonEndpointReachability(sourceUrl, fetchImpl, previousReason) {
  let response;
  try {
    response = await fetchImpl(sourceUrl, {
      method: 'HEAD',
      headers: {
        Accept: 'application/json, */*;q=0.8',
      },
      signal: createFetchSignal(),
    });
  } catch (error) {
    return { ok: false, method: 'HEAD', reason: describeFetchError(error) };
  }

  if (!response?.ok) {
    return { ok: false, method: 'HEAD', reason: formatHttpResponseFailure(response) };
  }

  const contentType = getResponseHeader(response, 'content-type');
  if (!isJsonContentType(contentType)) {
    const reason = contentType
      ? `content-type is not JSON (${contentType})`
      : 'content-type is not JSON';
    return { ok: false, method: 'HEAD', reason };
  }

  const fallbackReason = previousReason?.includes('timed out')
    ? 'GET validation timed out'
    : 'GET body validation failed';
  return {
    ok: true,
    method: 'HEAD',
    detail: `JSON endpoint reachable (${fallbackReason})`,
  };
}

export { checkJsonEndpointReachability };
