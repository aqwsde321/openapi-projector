import { findPrimaryResponse, getOperationParameters } from '../../openapi/media.mjs';
import { getByRef } from '../../openapi/refs.mjs';

function resolveOpenApiRef(spec, value) {
  if (!value) {
    return null;
  }

  return value.$ref ? getByRef(spec, value.$ref) : value;
}

function buildEndpointDocDetails({ entry, spec }) {
  const pathItem = spec.paths?.[entry.path] ?? {};
  const operation = pathItem?.[entry.method];
  const parameters = operation ? getOperationParameters(spec, pathItem, operation) : [];
  const requestBody = resolveOpenApiRef(spec, operation?.requestBody);
  const [successStatus, successResponseRaw] = findPrimaryResponse(operation?.responses ?? {});
  const successResponse = resolveOpenApiRef(spec, successResponseRaw);

  return {
    parameters,
    requestBody,
    requestMediaTypes: Object.keys(requestBody?.content ?? {}),
    responseMediaTypes: Object.keys(successResponse?.content ?? {}),
    successStatus,
    tags: Array.isArray(operation?.tags) ? operation.tags : [],
  };
}

export {
  buildEndpointDocDetails,
};
