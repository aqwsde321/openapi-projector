import {
  getRequestBodySchema,
  getResponseSchema,
} from '../openapi/media.mjs';
import { toPascalIdentifier } from '../projector/naming.mjs';
import {
  buildOperationRequestContext,
} from './operation/render-context.mjs';
import {
  summarizeFields,
  summarizeSchemaObject,
} from './review-schema-summary.mjs';

function buildEndpointApplicationReview({
  spec,
  endpoint,
  dtoPath,
  apiPath,
  hookPath = null,
}) {
  const { operation, functionName } = endpoint;
  const dtoBaseName = toPascalIdentifier(functionName);
  const requestDto = `${dtoBaseName}RequestDto`;
  const responseDto = `${dtoBaseName}ResponseDto`;
  const requestSchemaRaw = getRequestBodySchema(
    spec,
    operation.requestBody,
    operation.requestMediaType,
  );
  const responseSchemaRaw = getResponseSchema(
    spec,
    operation.successResponse,
    operation.responseMediaType,
  );
  const requestContext = buildOperationRequestContext(spec, operation);
  const requestShape = getReviewRequestDtoShape(requestContext);

  return {
    method: operation.method.toUpperCase(),
    path: operation.path,
    functionName,
    generatedFiles: {
      dto: dtoPath,
      api: apiPath,
      ...(hookPath ? { hook: hookPath } : {}),
    },
    requestDto: requestShape === 'none' ? null : requestDto,
    responseDto,
    request: {
      dtoShape: requestShape,
      mediaType: operation.requestMediaType ?? null,
      bodyRequired: Boolean(operation.requestBody?.required),
      pathParams: summarizeFields(requestContext.pathFields),
      queryParams: summarizeFields(requestContext.queryFields),
      headerParams: summarizeFields(requestContext.headerFields),
      cookieParams: summarizeFields(requestContext.cookieFields),
      body: summarizeSchemaObject(spec, requestSchemaRaw),
    },
    response: {
      status: operation.successStatus,
      mediaType: operation.responseMediaType ?? null,
      body: summarizeSchemaObject(spec, responseSchemaRaw),
    },
  };
}

function getReviewRequestDtoShape(requestShape) {
  if (!requestShape.hasAnyInputs) {
    return 'none';
  }

  if (requestShape.renderRequestAsBodyOnly) {
    return 'body-only';
  }

  return requestShape.canFlattenRequest ? 'flat' : 'nested';
}

export { buildEndpointApplicationReview };
