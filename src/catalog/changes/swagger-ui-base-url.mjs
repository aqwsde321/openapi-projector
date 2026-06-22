const OPENAPI_SOURCE_PATH_PATTERNS = [
  /\/v3\/api-docs(?:\/.*)?$/u,
  /\/api-docs(?:\/.*)?$/u,
  /\/openapi(?:\.json)?$/u,
  /\/swagger(?:\.json)?$/u,
];

function normalizeSwaggerUiBaseUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function inferSwaggerUiBaseUrl(sourceUrl) {
  if (typeof sourceUrl !== 'string' || !sourceUrl.trim()) {
    return null;
  }

  let url;
  try {
    url = new URL(sourceUrl);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null;
  }

  if (url.pathname.includes('/swagger-ui/')) {
    url.hash = '';
    return url.toString();
  }

  if (url.pathname.endsWith('/swagger-ui.html')) {
    url.pathname = url.pathname.replace(
      /\/swagger-ui\.html$/u,
      '/swagger-ui/index.html',
    );
    url.hash = '';
    return url.toString();
  }

  const inferredPath = OPENAPI_SOURCE_PATH_PATTERNS.reduce(
    (currentPath, pattern) =>
      currentPath === url.pathname
        ? currentPath.replace(pattern, '/swagger-ui/index.html')
        : currentPath,
    url.pathname,
  );

  if (inferredPath === url.pathname) {
    return null;
  }

  url.pathname = inferredPath;
  url.search = '';
  url.hash = '';
  return url.toString();
}

export {
  inferSwaggerUiBaseUrl,
  normalizeSwaggerUiBaseUrl,
};
