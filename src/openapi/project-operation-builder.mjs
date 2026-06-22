import { normalizeText, toKebabCase } from '../core/text-utils.mjs';
import {
  choosePreferredRequestMediaType,
  choosePreferredResponseMediaType,
  findPrimaryResponse,
  getOperationParameters,
} from './media.mjs';
import { getByRef } from './refs.mjs';

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

function buildProjectOperation({
  catalogEntry,
  endpointPath,
  method,
  operation,
  pathItem,
  spec,
}) {
  const parameters = getOperationParameters(spec, pathItem, operation);
  const requestBody = resolveRequestBody(spec, operation.requestBody);
  const requestContentTypes = Object.keys(requestBody?.content ?? {});
  const requestMediaType = choosePreferredRequestMediaType(requestContentTypes);
  const [successStatus, successResponseRaw] = findPrimaryResponse(operation.responses ?? {});
  const successResponse = resolveResponse(spec, successResponseRaw);
  const responseContentTypes = Object.keys(successResponse?.content ?? {});
  const responseMediaType = choosePreferredResponseMediaType(responseContentTypes);
  const tag = operation.tags?.[0] ?? 'default';

  return {
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
  };
}

export { buildProjectOperation };
