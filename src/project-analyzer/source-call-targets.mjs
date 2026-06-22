import ts from 'typescript';

function hasObjectProperty(objectExpression, propertyName) {
  return objectExpression.properties.some(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === propertyName,
  );
}

function isUrlArgument(node) {
  return Boolean(
    node &&
      (ts.isStringLiteral(node) ||
        node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
        ts.isTemplateExpression(node)),
  );
}

function detectCallStyle(callExpression) {
  const [firstArg, secondArg] = callExpression.arguments;

  if (firstArg && ts.isObjectLiteralExpression(firstArg)) {
    if (hasObjectProperty(firstArg, 'url')) {
      return 'request-object';
    }
  }

  if (
    isUrlArgument(firstArg) &&
    secondArg &&
    ts.isObjectLiteralExpression(secondArg)
  ) {
    return 'url-config';
  }

  return 'unknown';
}

function getCallTarget(node) {
  if (ts.isIdentifier(node.expression)) {
    return {
      symbol: node.expression.text,
      memberName: null,
    };
  }

  if (
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression)
  ) {
    return {
      symbol: node.expression.expression.text,
      memberName: node.expression.name.text,
    };
  }

  return null;
}

export {
  detectCallStyle,
  getCallTarget,
};
