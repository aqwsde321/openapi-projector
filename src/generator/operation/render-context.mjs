import { normalizeText } from '../../core/text-utils.mjs';
import {
  buildOperationParameterFields,
  buildOperationRequestContext,
  buildOperationRequestShape,
  buildOperationSchemas,
} from './request-context.mjs';
import { buildLocalSchemaContext } from './local-schema-context.mjs';
import { buildOperationTypeNames } from './type-names.mjs';

function buildOperationRenderContext({
  spec,
  operation,
  functionName,
}) {
  const {
    bodyTypeName,
    responseTypeName,
    requestShapeName,
  } = buildOperationTypeNames(functionName);
  const {
    bodyFields,
    canFlattenRequest,
    cookieFields,
    hasAnyInputs,
    hasRequestBody,
    headerFields,
    pathFields,
    queryFields,
    renderRequestAsBodyOnly,
    requestSchema,
    responseSchema,
    usesNestedRequest,
  } = buildOperationRequestContext(spec, operation);
  const bodyRequired = Boolean(operation.requestBody?.required);
  const docText = normalizeText(operation.summary || operation.description);
  const schemaContext = buildLocalSchemaContext(spec, operation, [
    bodyTypeName,
    responseTypeName,
    requestShapeName,
  ]);

  return {
    bodyFields,
    bodyRequired,
    bodyTypeName,
    canFlattenRequest,
    cookieFields,
    docText,
    hasAnyInputs,
    hasRequestBody,
    headerFields,
    operation,
    pathFields,
    queryFields,
    renderRequestAsBodyOnly,
    requestSchema,
    requestShapeName,
    responseSchema,
    responseTypeName,
    schemaContext,
    usesNestedRequest,
  };
}

export {
  buildOperationParameterFields,
  buildOperationRenderContext,
  buildOperationRequestContext,
  buildOperationRequestShape,
  buildOperationSchemas,
};
