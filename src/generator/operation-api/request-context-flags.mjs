import {
  buildPathTemplateExpression,
  getDestructuredLocalName,
} from './request-expressions.mjs';

function buildApiRequestFlags({
  pathFields,
  queryFields,
  headerFields,
  cookieFields,
  hasRequestBody,
  canFlattenRequest,
  usesNestedRequest,
}) {
  const usesRestQuery =
    canFlattenRequest &&
    pathFields.length > 0 &&
    queryFields.length > 0 &&
    headerFields.length === 0 &&
    cookieFields.length === 0 &&
    !hasRequestBody;
  const usesRestBody =
    canFlattenRequest &&
    pathFields.length > 0 &&
    queryFields.length === 0 &&
    headerFields.length === 0 &&
    cookieFields.length === 0 &&
    hasRequestBody;

  return {
    usesPathDestructure: pathFields.length > 0 && !usesNestedRequest,
    usesRestBody,
    usesRestQuery,
  };
}

function buildApiEndpointExpression({
  operation,
  pathFields,
  usesNestedRequest,
  usesPathDestructure,
}) {
  if (pathFields.length === 0) {
    return JSON.stringify(operation.path);
  }

  return buildPathTemplateExpression(operation.path, (key) => {
    if (usesNestedRequest) {
      return `requestDto.pathParams[${JSON.stringify(key)}]`;
    }

    if (usesPathDestructure) {
      return getDestructuredLocalName(key);
    }

    return `requestDto[${JSON.stringify(key)}]`;
  });
}

export {
  buildApiEndpointExpression,
  buildApiRequestFlags,
};
