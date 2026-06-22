const COMMON_OPENAPI_PATHS = [
  '/v3/api-docs',
  '/api-docs',
  '/openapi.json',
  '/swagger.json',
  '/swagger/v1/swagger.json',
];

function isLikelyOpenApiJsonUrl(sourceUrl) {
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return false;
  }

  return COMMON_OPENAPI_PATHS.some((candidatePath) => parsed.pathname.endsWith(candidatePath));
}

function inferOpenApiContextBasePaths(pathname) {
  const matches = [
    pathname.indexOf('/swagger-ui/'),
    pathname.indexOf('/swagger-ui.html'),
  ].filter((index) => index > 0);

  return [...new Set(matches.map((index) => pathname.slice(0, index)))];
}

function commonOpenApiUrlsFrom(sourceUrl) {
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return [];
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return [];
  }

  const originalUrl = parsed.href;
  const contextBasePaths = inferOpenApiContextBasePaths(parsed.pathname);
  const basePaths = [...contextBasePaths, ''];
  const candidates = basePaths.flatMap((basePath) =>
    COMMON_OPENAPI_PATHS.map((candidatePath) =>
      new URL(`${basePath}${candidatePath}`, parsed.origin).href,
    ),
  );

  return [...new Set(candidates)]
    .filter((candidateUrl) => candidateUrl !== originalUrl);
}

export {
  commonOpenApiUrlsFrom,
  isLikelyOpenApiJsonUrl,
};
