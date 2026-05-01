import { getRequestBodySchema } from '../core/openapi-utils.mjs';
import { toPascalIdentifier } from '../projector/naming.mjs';
import {
  buildFieldEntriesFromParameters,
  buildFieldEntriesFromSchema,
  hasDuplicateFieldNames,
  isSimpleObjectSchema,
  resolveSchema,
} from './render-dto.mjs';

const DEFAULT_QUERY_METHODS = ['GET'];
const DEFAULT_MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

function normalizeMethodList(value, fallback) {
  return (Array.isArray(value) ? value : fallback).map((method) =>
    String(method).toUpperCase(),
  );
}

function normalizeHookRules(hookRules = {}) {
  return {
    enabled: hookRules.enabled === true,
    library: hookRules.library ?? '@tanstack/react-query',
    queryMethods: normalizeMethodList(hookRules.queryMethods, DEFAULT_QUERY_METHODS),
    mutationMethods: normalizeMethodList(
      hookRules.mutationMethods,
      DEFAULT_MUTATION_METHODS,
    ),
    queryKeyStrategy: hookRules.queryKeyStrategy ?? 'path-and-params',
    responseUnwrap: hookRules.responseUnwrap ?? 'none',
    staleTimeImportPath: hookRules.staleTimeImportPath ?? null,
    staleTimeSymbol: hookRules.staleTimeSymbol ?? null,
  };
}

function buildPropertyAccess(sourceExpression, propertyName) {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(propertyName)) {
    return `${sourceExpression}.${propertyName}`;
  }

  return `${sourceExpression}[${JSON.stringify(propertyName)}]`;
}

function getRequestContext(spec, operation) {
  const pathFields = buildFieldEntriesFromParameters(operation.parameters ?? [], 'path');
  const queryFields = buildFieldEntriesFromParameters(operation.parameters ?? [], 'query');
  const headerFields = buildFieldEntriesFromParameters(operation.parameters ?? [], 'header');
  const cookieFields = buildFieldEntriesFromParameters(operation.parameters ?? [], 'cookie');
  const requestSchema = resolveSchema(
    spec,
    getRequestBodySchema(spec, operation.requestBody, operation.requestMediaType),
  );
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
  const renderRequestAsBodyOnly = hasRequestBody && !hasAnyParams;
  const canFlattenRequest =
    hasAnyInputs &&
    (!hasRequestBody ||
      (isSimpleObjectSchema(requestSchema) &&
        !hasDuplicateFieldNames([
          ...pathFields,
          ...queryFields,
          ...headerFields,
          ...cookieFields,
          ...bodyFields,
        ])));

  return {
    bodyFields,
    canFlattenRequest,
    hasAnyInputs,
    renderRequestAsBodyOnly,
    requestFields: [
      ...pathFields,
      ...queryFields,
      ...headerFields,
      ...cookieFields,
      ...bodyFields,
    ],
  };
}

function renderQueryKeyExpression({
  operation,
  requestContext,
  queryKeyStrategy,
}) {
  const baseKey = JSON.stringify(operation.path);

  if (!requestContext.hasAnyInputs) {
    return `[${baseKey}]`;
  }

  if (
    queryKeyStrategy === 'path-and-fields' &&
    (requestContext.canFlattenRequest || requestContext.renderRequestAsBodyOnly)
  ) {
    const fields = requestContext.renderRequestAsBodyOnly
      ? requestContext.bodyFields
      : requestContext.requestFields;

    if (fields.length > 0) {
      return `[${baseKey}, ${fields
        .map((field) => buildPropertyAccess('params', field.name))
        .join(', ')}]`;
    }
  }

  return `[${baseKey}, params]`;
}

function renderResponseReturn(responseExpression, responseUnwrap) {
  return responseUnwrap === 'data'
    ? `return ${responseExpression}.data;`
    : `return ${responseExpression};`;
}

function renderQueryHook({
  functionName,
  hookName,
  requestTypeName,
  operation,
  requestContext,
  hookRules,
}) {
  const queryKeyExpression = renderQueryKeyExpression({
    operation,
    requestContext,
    queryKeyStrategy: hookRules.queryKeyStrategy,
  });
  const lines = [
    `const ${hookName} = (${requestContext.hasAnyInputs ? `params: ${requestTypeName}` : ''}) => {`,
    '  return useQuery({',
    `    queryKey: ${queryKeyExpression},`,
    '    queryFn: async () => {',
    `      const response = await ${functionName}(${requestContext.hasAnyInputs ? 'params' : ''});`,
    `      ${renderResponseReturn('response', hookRules.responseUnwrap)}`,
    '    },',
  ];

  if (hookRules.staleTimeSymbol) {
    lines.push(`    staleTime: ${hookRules.staleTimeSymbol},`);
  }

  lines.push('  });', '};');
  return lines.join('\n');
}

function renderMutationHook({
  functionName,
  hookName,
  requestTypeName,
  requestContext,
  hookRules,
}) {
  const lines = [
    `const ${hookName} = () => {`,
    '  return useMutation({',
  ];

  if (hookRules.responseUnwrap === 'data') {
    lines.push(
      `    mutationFn: async (${requestContext.hasAnyInputs ? `params: ${requestTypeName}` : ''}) => {`,
      `      const response = await ${functionName}(${requestContext.hasAnyInputs ? 'params' : ''});`,
      '      return response.data;',
      '    },',
    );
  } else {
    lines.push(
      `    mutationFn: (${requestContext.hasAnyInputs ? `params: ${requestTypeName}` : ''}) => ${functionName}(${requestContext.hasAnyInputs ? 'params' : ''}),`,
    );
  }

  lines.push('  });', '};');
  return lines.join('\n');
}

function renderOperationHookSection({
  spec,
  operation,
  functionName,
  endpointFileBase,
  hookRules: rawHookRules = {},
}) {
  const hookRules = normalizeHookRules(rawHookRules);

  if (!hookRules.enabled) {
    return null;
  }

  const method = String(operation.method).toUpperCase();
  const isQuery = hookRules.queryMethods.includes(method);
  const isMutation = !isQuery && hookRules.mutationMethods.includes(method);

  if (!isQuery && !isMutation) {
    return null;
  }

  const dtoBaseName = toPascalIdentifier(functionName);
  const requestTypeName = `${dtoBaseName}RequestDto`;
  const hookSuffix = isQuery ? 'Query' : 'Mutation';
  const hookName = `use${dtoBaseName}${hookSuffix}`;
  const requestContext = getRequestContext(spec, operation);
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

  const hookSource = isQuery
    ? renderQueryHook({
        functionName,
        hookName,
        requestTypeName,
        operation,
        requestContext,
        hookRules,
      })
    : renderMutationHook({
        functionName,
        hookName,
        requestTypeName,
        requestContext,
        hookRules,
      });

  return {
    hookKind: isQuery ? 'query' : 'mutation',
    hookFileBase: `${endpointFileBase}.${isQuery ? 'query' : 'mutation'}`,
    hookName,
    hookSource: [...imports, '', hookSource, '', `export { ${hookName} };`, ''].join('\n'),
  };
}

export {
  normalizeHookRules,
  renderOperationHookSection,
};
