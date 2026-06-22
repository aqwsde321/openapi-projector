import { collectRefs } from '../../openapi/refs.mjs';
import { buildLocalSchemaContextFromRefs } from '../local-schema-context.mjs';
import { buildOperationRequestContext } from './request-context.mjs';

function buildLocalSchemaContext(spec, operation, reservedNames = []) {
  return buildLocalSchemaContextFromRefs(
    spec,
    collectOperationSchemaRefs(spec, operation),
    reservedNames,
  );
}

function collectOperationSchemaRefs(spec, operation) {
  const refs = new Set();
  const {
    pathFields,
    queryFields,
    headerFields,
    cookieFields,
    requestSchema,
    responseSchema,
  } = buildOperationRequestContext(spec, operation);
  const parameterFields = [
    ...pathFields,
    ...queryFields,
    ...headerFields,
    ...cookieFields,
  ];

  for (const field of parameterFields) {
    collectRefs(field.schema, refs);
  }

  collectRefs(requestSchema, refs);
  collectRefs(responseSchema, refs);

  return refs;
}

export { buildLocalSchemaContext };
