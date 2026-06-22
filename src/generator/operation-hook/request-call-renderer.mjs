function renderResponseReturn(responseExpression, responseUnwrap) {
  return responseUnwrap === 'data'
    ? `return ${responseExpression}.data;`
    : `return ${responseExpression};`;
}

function renderRequestParams(requestContext, requestTypeName) {
  return requestContext.hasAnyInputs ? `params: ${requestTypeName}` : '';
}

function renderRequestArgument(requestContext) {
  return requestContext.hasAnyInputs ? 'params' : '';
}

export {
  renderRequestArgument,
  renderRequestParams,
  renderResponseReturn,
};
