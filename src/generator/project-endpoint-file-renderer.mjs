import { renderOperationSection } from './render-operation-section.mjs';

function renderEndpointFile({
  spec,
  endpoint,
  runtimeFetchImportPath,
  runtimeFetchSymbol,
  runtimeFetchImportKind,
  runtimeCallStyle,
}) {
  const { operation, functionName, endpointFileBase } = endpoint;
  const rendered = renderOperationSection({
    spec,
    operation,
    functionName,
    dtoImportPath: `./${endpointFileBase}.dto`,
    runtimeFetchImportPath,
    runtimeFetchSymbol,
    runtimeFetchImportKind,
    runtimeCallStyle,
  });

  return {
    endpointFileBase,
    apiSource: [...rendered.apiImports, '', rendered.apiSource, ''].join('\n'),
    dtoSource: `${rendered.dtoSource}\n`,
  };
}

export { renderEndpointFile };
