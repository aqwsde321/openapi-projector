function buildHookSourceImports({
  endpointFileBase,
  functionName,
  hookRules,
  isQuery,
  requestContext,
  requestTypeName,
}) {
  const reactQueryImport = isQuery ? 'useQuery' : 'useMutation';
  const imports = [
    `import { ${reactQueryImport} } from '${hookRules.library}';`,
  ];

  if (isQuery && hookRules.staleTimeImportPath && hookRules.staleTimeSymbol) {
    imports.push(
      `import { ${hookRules.staleTimeSymbol} } from '${hookRules.staleTimeImportPath}';`,
    );
  }

  imports.push(`import { ${functionName} } from './${endpointFileBase}.api';`);

  if (requestContext.hasAnyInputs) {
    imports.push(
      `import type { ${requestTypeName} } from './${endpointFileBase}.dto';`,
    );
  }

  return imports;
}

export { buildHookSourceImports };
