import {
  getRequestBodySchema,
  getResponseSchema,
  schemaRefName,
} from '../core/openapi-utils.mjs';
import {
  buildFieldEntriesFromParameters,
  buildFieldEntriesFromSchema,
  hasDuplicateFieldNames,
  isSimpleObjectSchema,
  resolveSchema,
} from './render-dto.mjs';
import { toPascalIdentifier } from '../projector/naming.mjs';

function formatSchemaType(schema) {
  if (!schema) {
    return 'unknown';
  }

  if (schema.$ref) {
    return schemaRefName(schema.$ref);
  }

  if (Array.isArray(schema.enum)) {
    return schema.enum.map((item) => JSON.stringify(item)).join(' | ');
  }

  const types = Array.isArray(schema.type) ? schema.type : [schema.type].filter(Boolean);
  const nullable = Boolean(schema.nullable || types.includes('null'));
  const nonNullTypes = types.filter((type) => type !== 'null');
  let baseType = nonNullTypes.join(' | ');

  if (!baseType && schema.oneOf) {
    baseType = 'oneOf';
  } else if (!baseType && schema.anyOf) {
    baseType = 'anyOf';
  } else if (!baseType && schema.allOf) {
    baseType = 'allOf';
  } else if (!baseType) {
    baseType = 'unknown';
  }

  if (baseType === 'array' && schema.items) {
    baseType = `${formatSchemaType(schema.items)}[]`;
  }

  return nullable ? `${baseType} | null` : baseType;
}

function summarizeFields(fields) {
  return fields.map((field) => ({
    name: field.name,
    required: Boolean(field.required),
    type: formatSchemaType(field.schema),
  }));
}

function summarizeParameters(operation, location) {
  return summarizeFields(buildFieldEntriesFromParameters(operation.parameters ?? [], location));
}

function summarizeSchemaObject(spec, schema) {
  if (!schema) {
    return {
      schema: null,
      shape: 'none',
      fields: [],
    };
  }

  const resolvedSchema = resolveSchema(spec, schema);
  const schemaName = schema.$ref ? schemaRefName(schema.$ref) : null;
  const shape = schemaName ?? formatSchemaType(resolvedSchema ?? schema);
  const fields =
    resolvedSchema && isSimpleObjectSchema(resolvedSchema)
      ? summarizeFields(buildFieldEntriesFromSchema(resolvedSchema))
      : [];

  return {
    schema: schemaName,
    shape,
    fields,
  };
}

function getRequestDtoShape({ operation, requestSchema }) {
  const pathFields = buildFieldEntriesFromParameters(operation.parameters ?? [], 'path');
  const queryFields = buildFieldEntriesFromParameters(operation.parameters ?? [], 'query');
  const headerFields = buildFieldEntriesFromParameters(operation.parameters ?? [], 'header');
  const cookieFields = buildFieldEntriesFromParameters(operation.parameters ?? [], 'cookie');
  const bodyFields =
    requestSchema && isSimpleObjectSchema(requestSchema)
      ? buildFieldEntriesFromSchema(requestSchema)
      : [];
  const hasRequestBody = Boolean(requestSchema);
  const hasAnyParams =
    pathFields.length > 0 ||
    queryFields.length > 0 ||
    headerFields.length > 0 ||
    cookieFields.length > 0;
  const hasAnyInputs = hasAnyParams || hasRequestBody;

  if (!hasAnyInputs) {
    return 'none';
  }

  if (hasRequestBody && !hasAnyParams) {
    return 'body-only';
  }

  const canFlattenRequest =
    !hasRequestBody ||
    (isSimpleObjectSchema(requestSchema) &&
      !hasDuplicateFieldNames([
        ...pathFields,
        ...queryFields,
        ...headerFields,
        ...cookieFields,
        ...bodyFields,
      ]));

  return canFlattenRequest ? 'flat' : 'nested';
}

function buildEndpointApplicationReview({
  spec,
  endpoint,
  dtoPath,
  apiPath,
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
  const requestSchema = resolveSchema(spec, requestSchemaRaw);
  const requestShape = getRequestDtoShape({ operation, requestSchema });

  return {
    method: operation.method.toUpperCase(),
    path: operation.path,
    functionName,
    generatedFiles: {
      dto: dtoPath,
      api: apiPath,
    },
    requestDto: requestShape === 'none' ? null : requestDto,
    responseDto,
    request: {
      dtoShape: requestShape,
      mediaType: operation.requestMediaType ?? null,
      bodyRequired: Boolean(operation.requestBody?.required),
      pathParams: summarizeParameters(operation, 'path'),
      queryParams: summarizeParameters(operation, 'query'),
      headerParams: summarizeParameters(operation, 'header'),
      cookieParams: summarizeParameters(operation, 'cookie'),
      body: summarizeSchemaObject(spec, requestSchemaRaw),
    },
    response: {
      status: operation.successStatus,
      mediaType: operation.responseMediaType ?? null,
      body: summarizeSchemaObject(spec, responseSchemaRaw),
    },
  };
}

function buildRuntimeWrapperReview({
  runtimeFetchImportPath,
  runtimeFetchSymbol,
  runtimeFetchImportKind,
  runtimeCallStyle,
}) {
  return {
    importPath: runtimeFetchImportPath,
    importSymbol: runtimeFetchSymbol,
    importKind: runtimeFetchImportKind,
    adapterStyle: runtimeCallStyle,
    callShape:
      runtimeCallStyle === 'request-object'
        ? 'fetchAPI({ url, method, params, data, headers })'
        : 'fetchAPI(url, { method, params, data, headers })',
    assumptions: [
      'The imported helper returns the response body typed as T.',
      'If the project helper returns AxiosResponse<T> or a response envelope, adapt the wrapper before copying generated API files.',
      'Request params, data, headers, and method must match the existing frontend client contract.',
    ],
  };
}

export {
  buildEndpointApplicationReview,
  buildRuntimeWrapperReview,
};
