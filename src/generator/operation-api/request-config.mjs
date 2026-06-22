import { buildObjectLiteral } from './request-expressions.mjs';

function buildRequestConfigEntries({
  operation,
  queryFields,
  headerFields,
  cookieFields,
  bodyFields,
  hasRequestBody,
  renderRequestAsBodyOnly,
  usesRestQuery,
  usesRestBody,
  usesNestedRequest,
}) {
  const configEntries = [`method: ${JSON.stringify(operation.method.toUpperCase())}`];

  if (queryFields.length > 0) {
    configEntries.push(
      usesRestQuery
        ? 'params'
        : `params: ${usesNestedRequest ? 'requestDto.params' : buildObjectLiteral(queryFields, 'requestDto')}`,
    );
  }

  if (hasRequestBody) {
    if (renderRequestAsBodyOnly) {
      configEntries.push('data: requestDto');
    } else if (usesRestBody) {
      configEntries.push('data');
    } else if (usesNestedRequest) {
      configEntries.push('data: requestDto.data');
    } else {
      configEntries.push(`data: ${buildObjectLiteral(bodyFields, 'requestDto')}`);
    }
  }

  if (headerFields.length > 0 || cookieFields.length > 0) {
    configEntries.push('headers: Object.keys(headers).length > 0 ? headers : undefined');
  }

  return configEntries;
}

export { buildRequestConfigEntries };
