function renderApiFunctionBody({
  functionName,
  responseTypeName,
  runtimeCallStyle,
  signature,
  functionBodyLines,
  endpointExpression,
  configEntries,
}) {
  const responseStartLines = runtimeCallStyle === 'request-object'
    ? [
        `  const response = await fetchAPI<${responseTypeName}>({`,
        `    url: ${endpointExpression},`,
      ]
    : [`  const response = await fetchAPI<${responseTypeName}>(${endpointExpression}, {`];

  return [
    `export const ${functionName} = async ${signature} => {`,
    ...functionBodyLines,
    ...responseStartLines,
    ...configEntries.map((entry) => `    ${entry},`),
    '  });',
    '  return response;',
    '};',
  ];
}

export { renderApiFunctionBody };
