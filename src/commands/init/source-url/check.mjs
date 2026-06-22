import {
  commonOpenApiUrlsFrom,
} from '#src/openapi/source-url-utils.mjs';
import { checkSourceUrlWithReachabilityFallback } from './reachability-fallback.mjs';

async function resolveReachableSourceUrl({ sourceUrl, fetchImpl, stdout }) {
  stdout.write('\nChecking OpenAPI JSON URL...\n');

  const directResult = await checkSourceUrlWithReachabilityFallback({
    fetchImpl,
    sourceUrl,
    stdout,
  });
  if (directResult.ok) {
    return directResult;
  }

  let suggestedSourceUrl = directResult.suggestedSourceUrl ?? null;
  const candidates = commonOpenApiUrlsFrom(sourceUrl);
  if (candidates.length === 0) {
    return { ok: false, suggestedSourceUrl };
  }

  const origin = new URL(sourceUrl).origin;
  stdout.write(`Trying common OpenAPI paths from ${origin}...\n`);

  for (const candidateUrl of candidates) {
    const candidateResult = await checkSourceUrlWithReachabilityFallback({
      fetchImpl,
      sourceUrl: candidateUrl,
      stdout,
    });

    if (candidateResult.ok) {
      stdout.write(`Using discovered sourceUrl: ${candidateUrl}\n`);
      return { ok: true, sourceUrl: candidateUrl };
    }

    suggestedSourceUrl ??= candidateResult.suggestedSourceUrl ?? null;
  }

  return { ok: false, suggestedSourceUrl };
}

export { resolveReachableSourceUrl };
