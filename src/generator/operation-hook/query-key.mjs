function buildPropertyAccess(sourceExpression, propertyName) {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(propertyName)) {
    return `${sourceExpression}.${propertyName}`;
  }

  return `${sourceExpression}[${JSON.stringify(propertyName)}]`;
}

function renderQueryKeyExpression({
  operation,
  requestContext,
  queryKeyStrategy,
}) {
  const baseKey = JSON.stringify(operation.path);

  if (!requestContext.hasAnyInputs) {
    return `[${baseKey}]`;
  }

  if (
    queryKeyStrategy === 'path-and-fields' &&
    (requestContext.canFlattenRequest || requestContext.renderRequestAsBodyOnly)
  ) {
    const fields = requestContext.renderRequestAsBodyOnly
      ? requestContext.bodyFields
      : requestContext.requestFields;

    if (fields.length > 0) {
      return `[${baseKey}, ${fields
        .map((field) => buildPropertyAccess('params', field.name))
        .join(', ')}]`;
    }
  }

  return `[${baseKey}, params]`;
}

export {
  renderQueryKeyExpression,
};
