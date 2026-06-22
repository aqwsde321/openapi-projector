const SOURCE_URL_CHECK_TIMEOUT_MS = 5000;

function isAuthFailureReason(reason) {
  return /^HTTP (401|403)(\b| )/.test(reason ?? '');
}

function createFetchSignal(timeoutMs = SOURCE_URL_CHECK_TIMEOUT_MS) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs);
  }

  return undefined;
}

function isTimeoutError(error) {
  const timeoutCodes = new Set([
    'ETIMEDOUT',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_BODY_TIMEOUT',
  ]);
  return (
    error?.name === 'AbortError'
    || error?.name === 'TimeoutError'
    || timeoutCodes.has(error?.code)
    || timeoutCodes.has(error?.cause?.code)
  );
}

function describeFetchError(error, timeoutMs = SOURCE_URL_CHECK_TIMEOUT_MS) {
  if (isTimeoutError(error)) {
    return `request timed out after ${timeoutMs}ms`;
  }

  return error?.message ?? String(error);
}

function getResponseHeader(response, headerName) {
  if (typeof response?.headers?.get === 'function') {
    return response.headers.get(headerName);
  }

  return null;
}

function formatHttpResponseFailure(response) {
  const status = response?.status ?? 'unknown';
  const statusText = response?.statusText ? ` ${response.statusText}` : '';

  return `HTTP ${status}${statusText}`;
}

function isJsonContentType(contentType) {
  return typeof contentType === 'string' && /(^|[+/])json($|[;\s])/i.test(contentType);
}

export {
  createFetchSignal,
  describeFetchError,
  formatHttpResponseFailure,
  getResponseHeader,
  isAuthFailureReason,
  isJsonContentType,
  isTimeoutError,
};
