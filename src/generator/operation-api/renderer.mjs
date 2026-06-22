import {
  buildApiRequestRenderContext,
} from './request-renderer.mjs';
import {
  buildApiFunctionImports,
} from './imports.mjs';
import { buildApiFunctionSignature } from './signature.mjs';
import { renderApiFunctionBody } from './body-renderer.mjs';
import { renderApiFunctionDocLines } from '../operation-doc-lines.mjs';

function renderApiFunctionSource({
  functionName,
  dtoImportPath,
  runtimeFetchImportPath,
  runtimeFetchSymbol,
  runtimeFetchImportKind,
  runtimeCallStyle,
  context,
}) {
  const {
    bodyTypeName,
    docText,
    hasAnyInputs,
    responseTypeName,
  } = context;
  const apiLines = renderApiFunctionDocLines(docText);

  const {
    apiTypeImports,
    signature,
  } = buildApiFunctionSignature({
    bodyTypeName,
    hasAnyInputs,
    responseTypeName,
  });

  const {
    configEntries,
    endpointExpression,
    functionBodyLines,
  } = buildApiRequestRenderContext({
    context,
  });

  apiLines.push(
    ...renderApiFunctionBody({
      functionName,
      responseTypeName,
      runtimeCallStyle,
      signature,
      functionBodyLines,
      endpointExpression,
      configEntries,
    }),
  );

  return {
    apiSource: apiLines.join('\n'),
    apiImports: buildApiFunctionImports({
      apiTypeImports,
      dtoImportPath,
      runtimeFetchImportKind,
      runtimeFetchImportPath,
      runtimeFetchSymbol,
    }),
  };
}

export { renderApiFunctionSource };
