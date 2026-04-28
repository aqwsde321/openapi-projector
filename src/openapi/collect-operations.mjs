import {
  HTTP_METHOD_ORDER,
  buildEndpointCatalog,
  choosePreferredRequestMediaType,
  choosePreferredResponseMediaType,
  findPrimaryResponse,
  getByRef,
  getOperationParameters,
  normalizeText,
  toKebabCase,
} from '../core/openapi-utils.mjs';

function resolveRequestBody(spec, requestBody) {
  if (!requestBody) {
    return null;
  }

  return requestBody.$ref ? getByRef(spec, requestBody.$ref) : requestBody;
}

function resolveResponse(spec, response) {
  if (!response) {
    return null;
  }

  return response.$ref ? getByRef(spec, response.$ref) : response;
}

function collectProjectOperations(spec) {
  const catalogEntries = buildEndpointCatalog(spec);
  const catalogMap = new Map(
    catalogEntries.map((entry) => [`${entry.method} ${entry.path}`, entry]),
  );
  const operations = [];

  for (const endpointPath of Object.keys(spec.paths ?? {}).sort((left, right) =>
    left.localeCompare(right),
  )) {
    const pathItem = spec.paths?.[endpointPath] ?? {};

    for (const method of HTTP_METHOD_ORDER) {
      const operation = pathItem?.[method];

      if (!operation) {
        continue;
      }

      const catalogEntry = catalogMap.get(`${method} ${endpointPath}`);
      const parameters = getOperationParameters(spec, pathItem, operation);
      const requestBody = resolveRequestBody(spec, operation.requestBody);
      const requestContentTypes = Object.keys(requestBody?.content ?? {});
      const requestMediaType = choosePreferredRequestMediaType(requestContentTypes);
      const [successStatus, successResponseRaw] = findPrimaryResponse(operation.responses ?? {});
      const successResponse = resolveResponse(spec, successResponseRaw);
      const responseContentTypes = Object.keys(successResponse?.content ?? {});
      const responseMediaType = choosePreferredResponseMediaType(responseContentTypes);
      const tag = operation.tags?.[0] ?? 'default';

      operations.push({
        endpointId: catalogEntry?.id ?? toKebabCase(`${method}-${endpointPath}`),
        method,
        path: endpointPath,
        summary: normalizeText(operation.summary),
        description: normalizeText(operation.description),
        operationId: operation.operationId ?? null,
        parameters,
        requestBody,
        requestContentTypes,
        requestMediaType,
        successStatus,
        successResponse,
        responseContentTypes,
        responseMediaType,
        tag,
      });
    }
  }

  return operations;
}

export { collectProjectOperations };
