import { renderOperationDtoSource } from './operation-dto/renderer.mjs';
import { renderApiFunctionSource } from './operation-api/renderer.mjs';
import {
  buildOperationParameterFields,
  buildOperationRenderContext,
  buildOperationRequestContext,
  buildOperationRequestShape,
  buildOperationSchemas,
} from './operation/render-context.mjs';

function renderOperationSection({
  spec,
  operation,
  functionName,
  dtoImportPath,
  runtimeFetchImportPath,
  runtimeFetchSymbol,
  runtimeFetchImportKind = 'named',
  runtimeCallStyle,
}) {
  const context = buildOperationRenderContext({
    spec,
    operation,
    functionName,
  });
  const dtoSource = renderOperationDtoSource({
    spec,
    operation,
    context,
  });

  const renderedApi = renderApiFunctionSource({
    functionName,
    dtoImportPath,
    runtimeFetchImportPath,
    runtimeFetchSymbol,
    runtimeFetchImportKind,
    runtimeCallStyle,
    context,
  });

  return {
    apiSource: renderedApi.apiSource,
    dtoSource,
    apiImports: renderedApi.apiImports,
  };
}

export {
  buildOperationParameterFields,
  buildOperationRequestContext,
  buildOperationSchemas,
  buildOperationRequestShape,
  renderOperationSection,
};
