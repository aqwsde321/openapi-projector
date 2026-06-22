import {
  describeFetchError,
  validateOpenApiJson,
} from '#src/openapi/source-url-utils.mjs';

async function validateOpenApiResponseBody(response) {
  let body;
  try {
    body = await response.text();
  } catch (error) {
    return {
      ok: false,
      reason: `could not read response body: ${describeFetchError(error)}`,
      canCheckReachability: true,
    };
  }

  let spec;
  try {
    spec = JSON.parse(body);
  } catch {
    return { ok: false, reason: 'response is not JSON' };
  }

  const validationError = validateOpenApiJson(spec);
  if (validationError) {
    return { ok: false, reason: validationError };
  }

  return { ok: true, detail: `OpenAPI ${spec.openapi}` };
}

export { validateOpenApiResponseBody };
