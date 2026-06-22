import {
  getRequestBodySchema,
  getResponseSchema,
} from '../../openapi/media.mjs';
import {
  buildFieldEntriesFromParameters,
} from '../dto/source-renderer.mjs';
import { resolveSchema } from '../dto/schema-utils.mjs';
import { buildOperationRequestShape } from './request-shape.mjs';

function buildOperationRequestContext(spec, operation) {
  const parameterFields = buildOperationParameterFields(spec, operation);
  const schemas = buildOperationSchemas(spec, operation);
  const requestShape = buildOperationRequestShape({
    requestSchema: schemas.requestSchema,
    ...parameterFields,
  });
  const requestFields = [
    ...parameterFields.pathFields,
    ...parameterFields.queryFields,
    ...parameterFields.headerFields,
    ...parameterFields.cookieFields,
    ...requestShape.bodyFields,
  ];

  return {
    ...parameterFields,
    ...schemas,
    ...requestShape,
    requestFields,
  };
}

function buildOperationParameterFields(spec, operation) {
  const parameters = operation.parameters ?? [];

  return {
    pathFields: buildFieldEntriesFromParameters(parameters, 'path'),
    queryFields: buildFieldEntriesFromParameters(parameters, 'query', {
      spec,
      flattenObjectParameters: true,
    }),
    headerFields: buildFieldEntriesFromParameters(parameters, 'header'),
    cookieFields: buildFieldEntriesFromParameters(parameters, 'cookie'),
  };
}

function buildOperationSchemas(spec, operation) {
  return {
    requestSchema: resolveSchema(
      spec,
      getRequestBodySchema(spec, operation.requestBody, operation.requestMediaType),
    ),
    responseSchema: resolveSchema(
      spec,
      getResponseSchema(spec, operation.successResponse, operation.responseMediaType),
    ),
  };
}

export {
  buildOperationParameterFields,
  buildOperationRequestContext,
  buildOperationRequestShape,
  buildOperationSchemas,
};
