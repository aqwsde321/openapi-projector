import {
  inferSwaggerUiBaseUrl,
  normalizeSwaggerUiBaseUrl,
} from './swagger-ui-base-url.mjs';

function resolveSwaggerUiBaseUrl(projectConfig = {}, projectConfigOverrides = projectConfig) {
  const configuredSwaggerUiUrl = normalizeSwaggerUiBaseUrl(
    projectConfigOverrides.swaggerUiUrl ?? projectConfig.swaggerUiUrl,
  );
  if (configuredSwaggerUiUrl) {
    return configuredSwaggerUiUrl;
  }

  return Object.hasOwn(projectConfigOverrides, 'sourceUrl')
    ? inferSwaggerUiBaseUrl(projectConfig.sourceUrl)
    : null;
}

function buildSwaggerOperationUrl(entry, swaggerUiBaseUrl) {
  if (!entry?.operationId || !swaggerUiBaseUrl) {
    return null;
  }

  const tag = Array.isArray(entry.tags) && entry.tags.length > 0
    ? entry.tags[0]
    : null;
  if (!tag) {
    return null;
  }

  const url = new URL(swaggerUiBaseUrl);
  url.hash = `/${encodeURIComponent(tag)}/${encodeURIComponent(entry.operationId)}`;
  return url.toString();
}

export {
  buildSwaggerOperationUrl,
  resolveSwaggerUiBaseUrl,
};
