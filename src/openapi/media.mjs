import { getByRef } from './refs.mjs';
import {
  choosePreferredRequestMediaType,
  choosePreferredResponseMediaType,
} from './media-types.mjs';

function getOperationParameters(spec, pathItem, operation) {
  const parameters = [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])];

  return parameters.map((parameter) =>
    parameter.$ref ? getByRef(spec, parameter.$ref) : parameter,
  );
}

function findPrimaryResponse(responses = {}) {
  const priorities = ['200', '201', '202', '204', '2XX'];

  for (const status of priorities) {
    if (responses[status]) {
      return [status, responses[status]];
    }
  }

  const explicitSuccessEntry = Object.entries(responses)
    .filter(([status]) => /^2\d\d$/.test(status))
    .sort(([left], [right]) => Number(left) - Number(right))[0];

  return explicitSuccessEntry ?? [null, null];
}

function getContentSchema(content, preferredMediaType, chooseMediaType) {
  if (preferredMediaType && content[preferredMediaType]) {
    return content[preferredMediaType]?.schema ?? null;
  }

  const mediaTypes = Object.keys(content);
  const selectedMediaType = chooseMediaType(mediaTypes) ?? mediaTypes[0];
  return selectedMediaType ? content[selectedMediaType]?.schema ?? null : null;
}

function getResponseSchema(spec, response, preferredMediaType = null) {
  const resolvedResponse = response?.$ref ? getByRef(spec, response.$ref) : response;
  const content = resolvedResponse?.content ?? {};
  return getContentSchema(content, preferredMediaType, choosePreferredResponseMediaType);
}

function getRequestBodySchema(spec, requestBody, preferredMediaType = null) {
  const resolvedBody = requestBody?.$ref ? getByRef(spec, requestBody.$ref) : requestBody;
  const content = resolvedBody?.content ?? {};
  return getContentSchema(content, preferredMediaType, choosePreferredRequestMediaType);
}

export {
  choosePreferredRequestMediaType,
  choosePreferredResponseMediaType,
  findPrimaryResponse,
  getOperationParameters,
  getRequestBodySchema,
  getResponseSchema,
};
