import {
  isAuthFailureReason,
  isLikelyOpenApiJsonUrl,
} from '#src/openapi/source-url-utils.mjs';
import {
  checkJsonEndpointReachability,
  checkOpenApiSourceUrl,
} from './http-checks.mjs';
import { writeUrlCheckResult } from './output.mjs';

async function checkSourceUrlWithReachabilityFallback({ sourceUrl, fetchImpl, stdout }) {
  const getResult = await checkOpenApiSourceUrl(sourceUrl, fetchImpl);
  writeUrlCheckResult(stdout, { ...getResult, sourceUrl });
  if (getResult.ok) {
    return { ok: true, sourceUrl };
  }

  if (getResult.canCheckReachability) {
    const headResult = await checkJsonEndpointReachability(
      sourceUrl,
      fetchImpl,
      getResult.reason,
    );
    writeUrlCheckResult(stdout, { ...headResult, sourceUrl });

    if (headResult.ok) {
      return { ok: true, sourceUrl };
    }

    return { ok: false, suggestedSourceUrl: sourceUrl };
  }

  if (isAuthFailureReason(getResult.reason) && isLikelyOpenApiJsonUrl(sourceUrl)) {
    return { ok: false, suggestedSourceUrl: sourceUrl };
  }

  return { ok: false };
}

export { checkSourceUrlWithReachabilityFallback };
