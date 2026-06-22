import {
  buildApiEndpointExpression,
  buildApiRequestFlags,
} from './request-context-flags.mjs';
import { buildRequestConfigEntries } from './request-config.mjs';
import { buildRequestPreludeLines } from './request-prelude.mjs';

function buildApiRequestRenderContext({
  context,
}) {
  const {
    bodyFields,
    canFlattenRequest,
    cookieFields,
    hasRequestBody,
    headerFields,
    operation,
    pathFields,
    queryFields,
    renderRequestAsBodyOnly,
    usesNestedRequest,
  } = context;
  const {
    usesPathDestructure,
    usesRestBody,
    usesRestQuery,
  } = buildApiRequestFlags({
    pathFields,
    queryFields,
    headerFields,
    cookieFields,
    hasRequestBody,
    canFlattenRequest,
    usesNestedRequest,
  });

  const endpointExpression = buildApiEndpointExpression({
    operation,
    pathFields,
    usesNestedRequest,
    usesPathDestructure,
  });

  const functionBodyLines = buildRequestPreludeLines({
    pathFields,
    headerFields,
    cookieFields,
    usesRestQuery,
    usesRestBody,
    usesPathDestructure,
    usesNestedRequest,
  });
  const configEntries = buildRequestConfigEntries({
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
  });

  return {
    configEntries,
    endpointExpression,
    functionBodyLines,
  };
}

export { buildApiRequestRenderContext };
