import {
  createFetchSignal,
  describeFetchError,
  formatHttpResponseFailure,
  isTimeoutError,
} from '#src/openapi/source-url-utils.mjs';
import { checkJsonEndpointReachability } from './head-check.mjs';
import { validateOpenApiResponseBody } from './response-body.mjs';

async function checkOpenApiSourceUrl(sourceUrl, fetchImpl) {
  try {
    new URL(sourceUrl);
  } catch {
    return { ok: false, reason: 'invalid URL' };
  }

  if (typeof fetchImpl !== 'function') {
    return { ok: false, reason: 'fetch is not available in this Node.js runtime' };
  }

  let response;
  try {
    response = await fetchImpl(sourceUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json, */*;q=0.8',
      },
      signal: createFetchSignal(),
    });
  } catch (error) {
    return {
      ok: false,
      reason: describeFetchError(error),
      canCheckReachability: isTimeoutError(error),
    };
  }

  if (!response?.ok) {
    return { ok: false, reason: formatHttpResponseFailure(response) };
  }

  return validateOpenApiResponseBody(response);
}

export {
  checkJsonEndpointReachability,
  checkOpenApiSourceUrl,
};
