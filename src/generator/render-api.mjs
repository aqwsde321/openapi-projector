import {
  getRequestBodySchema,
  getResponseSchema,
  normalizeText,
  toCamelCase,
  toKebabCase,
} from '../core/openapi-utils.mjs';
import {
  buildFieldEntriesFromParameters,
  buildFieldEntriesFromSchema,
  buildLocalSchemaContext,
  hasDuplicateFieldNames,
  isSimpleObjectSchema,
  renderConcreteNamedSchema,
  renderInlineRequestDtoSource,
  renderNestedRequestDtoSource,
  resolveSchema,
} from './render-dto.mjs';
import {
  buildOperationSymbolBase,
  createUniqueName,
  toPascalIdentifier,
} from '../projector/naming.mjs';

function getDestructuredLocalName(propertyName) {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(propertyName)) {
    return propertyName;
  }

  return toCamelCase(propertyName);
}

function buildPathTemplateExpression(template, getValueExpression) {
  return `\`${template.replace(
    /\{([^}]+)\}/g,
    (_, key) => `\${encodeURIComponent(String(${getValueExpression(key)}))}`,
  )}\``;
}

function buildObjectLiteral(entries, sourceExpression) {
  return `{ ${entries
    .map((entry) => `${JSON.stringify(entry.name)}: ${sourceExpression}[${JSON.stringify(entry.name)}]`)
    .join(', ')} }`;
}

function buildDestructuringEntries(entries) {
  return entries.map((entry) => {
    const propertyName = String(entry.name);
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(propertyName)) {
      return propertyName;
    }
    return `${JSON.stringify(propertyName)}: ${getDestructuredLocalName(propertyName)}`;
  });
}

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
  const dtoBaseName = toPascalIdentifier(functionName);
  const bodyTypeName = `${dtoBaseName}RequestDto`;
  const responseTypeName = `${dtoBaseName}ResponseDto`;
  const requestShapeName = `${dtoBaseName}Body`;
  const pathFields = buildFieldEntriesFromParameters(operation.parameters, 'path');
  const queryFields = buildFieldEntriesFromParameters(operation.parameters, 'query');
  const headerFields = buildFieldEntriesFromParameters(operation.parameters, 'header');
  const cookieFields = buildFieldEntriesFromParameters(operation.parameters, 'cookie');
  const requestSchema = resolveSchema(
    spec,
    getRequestBodySchema(spec, operation.requestBody, operation.requestMediaType),
  );
  const responseSchema = resolveSchema(
    spec,
    getResponseSchema(spec, operation.successResponse, operation.responseMediaType),
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
  const usesNestedRequest = hasAnyInputs && !renderRequestAsBodyOnly && !canFlattenRequest;
  const bodyRequired = Boolean(operation.requestBody?.required);
  const docText = normalizeText(operation.summary || operation.description);
  const schemaContext = buildLocalSchemaContext(spec, operation, [
    bodyTypeName,
    responseTypeName,
    requestShapeName,
  ]);
  const dtoLines = [];

  if (schemaContext.localSchemaNames.length > 0) {
    for (const localSchemaName of schemaContext.localSchemaNames) {
      dtoLines.push(
        renderConcreteNamedSchema(
          schemaContext.schemaNameMap.get(localSchemaName),
          spec.components.schemas[localSchemaName],
          schemaContext.renderer,
          spec.components.schemas[localSchemaName]?.description,
        ),
      );
      dtoLines.push('');
    }
  }

  if (renderRequestAsBodyOnly && requestSchema) {
    dtoLines.push(
      renderConcreteNamedSchema(
        bodyTypeName,
        requestSchema,
        schemaContext.renderer,
        operation.requestBody?.description ?? docText,
      ),
    );
    dtoLines.push('');
  } else if (canFlattenRequest) {
    dtoLines.push(
      renderInlineRequestDtoSource({
        name: bodyTypeName,
        description: operation.requestBody?.description ?? docText,
        fields: [...pathFields, ...queryFields, ...headerFields, ...cookieFields, ...bodyFields],
        renderer: schemaContext.renderer,
      }),
    );
    dtoLines.push('');
  } else if (usesNestedRequest) {
    if (hasRequestBody && requestSchema) {
      dtoLines.push(
        renderConcreteNamedSchema(
          requestShapeName,
          requestSchema,
          schemaContext.renderer,
          operation.requestBody?.description ?? docText,
        ),
      );
      dtoLines.push('');
    }

    dtoLines.push(
      renderNestedRequestDtoSource({
        name: bodyTypeName,
        description: operation.requestBody?.description ?? docText,
        pathFields,
        queryFields,
        headerFields,
        cookieFields,
        bodyTypeName: hasRequestBody ? requestShapeName : null,
        hasRequestBody,
        bodyRequired,
        renderer: schemaContext.renderer,
      }),
    );
    dtoLines.push('');
  }

  dtoLines.push(
    renderConcreteNamedSchema(
      responseTypeName,
      responseSchema ?? {},
      schemaContext.renderer,
      operation.successResponse?.description ?? docText,
    ),
  );
  dtoLines.push('');

  const apiLines = [];
  if (docText) {
    apiLines.push('/**');
    for (const docLine of docText.split('\n')) {
      apiLines.push(` * ${docLine}`);
    }
    apiLines.push(' */');
  }

  let signature = `(): Promise<${responseTypeName}>`;
  const apiTypeImports = new Set([responseTypeName]);
  const usesRestQuery =
    canFlattenRequest &&
    pathFields.length > 0 &&
    queryFields.length > 0 &&
    headerFields.length === 0 &&
    cookieFields.length === 0 &&
    !hasRequestBody;
  const usesRestBody =
    canFlattenRequest &&
    pathFields.length > 0 &&
    queryFields.length === 0 &&
    headerFields.length === 0 &&
    cookieFields.length === 0 &&
    hasRequestBody;
  const usesPathDestructure = pathFields.length > 0 && !usesNestedRequest;

  if (hasAnyInputs) {
    signature = `(requestDto: ${bodyTypeName}): Promise<${responseTypeName}>`;
    apiTypeImports.add(bodyTypeName);
  }

  const endpointExpression = pathFields.length > 0
    ? buildPathTemplateExpression(operation.path, (key) => {
        if (usesNestedRequest) {
          return `requestDto.pathParams[${JSON.stringify(key)}]`;
        }

        if (usesPathDestructure) {
          return getDestructuredLocalName(key);
        }

        return `requestDto[${JSON.stringify(key)}]`;
      })
    : JSON.stringify(operation.path);

  const functionBodyLines = [];

  if (usesRestQuery || usesRestBody) {
    functionBodyLines.push(
      `  const { ${buildDestructuringEntries(pathFields).join(', ')}, ...${
        usesRestQuery ? 'params' : 'data'
      } } = requestDto;`,
    );
  } else if (usesPathDestructure) {
    functionBodyLines.push(
      `  const { ${buildDestructuringEntries(pathFields).join(', ')} } = requestDto;`,
    );
  }

  if (headerFields.length > 0) {
    const headerSource = usesNestedRequest
      ? 'requestDto.headers ?? {}'
      : buildObjectLiteral(headerFields, 'requestDto');
    functionBodyLines.push(
      `  const headers = Object.fromEntries(Object.entries(${headerSource}).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => [key, String(value)])) as Record<string, string>;`,
    );
  }

  if (cookieFields.length > 0) {
    const cookieSource = usesNestedRequest
      ? 'requestDto.cookies ?? {}'
      : buildObjectLiteral(cookieFields, 'requestDto');
    functionBodyLines.push(
      `  const cookieEntries = Object.entries(${cookieSource}).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => \`\${encodeURIComponent(key)}=\${encodeURIComponent(String(value))}\`);`,
    );
    if (headerFields.length === 0) {
      functionBodyLines.push('  const headers = {} as Record<string, string>;');
    }
    functionBodyLines.push("  if (cookieEntries.length > 0) headers.Cookie = cookieEntries.join('; ');");
  }

  const configEntries = [`method: ${JSON.stringify(operation.method.toUpperCase())}`];

  if (queryFields.length > 0) {
    configEntries.push(
      usesRestQuery
        ? 'params'
        : `params: ${usesNestedRequest ? 'requestDto.params' : buildObjectLiteral(queryFields, 'requestDto')}`,
    );
  }

  if (hasRequestBody) {
    if (renderRequestAsBodyOnly) {
      configEntries.push('data: requestDto');
    } else if (usesRestBody) {
      configEntries.push('data');
    } else if (usesNestedRequest) {
      configEntries.push('data: requestDto.data');
    } else {
      configEntries.push(`data: ${buildObjectLiteral(bodyFields, 'requestDto')}`);
    }
  }

  if (headerFields.length > 0 || cookieFields.length > 0) {
    configEntries.push('headers: Object.keys(headers).length > 0 ? headers : undefined');
  }

  if (runtimeCallStyle === 'request-object') {
    apiLines.push(
      `export const ${functionName} = async ${signature} => {`,
      ...functionBodyLines,
      `  const response = await fetchAPI<${responseTypeName}>({`,
      `    url: ${endpointExpression},`,
      ...configEntries.map((entry) => `    ${entry},`),
      '  });',
      '  return response;',
      '};',
    );
  } else {
    apiLines.push(
      `export const ${functionName} = async ${signature} => {`,
      ...functionBodyLines,
      `  const response = await fetchAPI<${responseTypeName}>(${endpointExpression}, {`,
      ...configEntries.map((entry) => `    ${entry},`),
      '  });',
      '  return response;',
      '};',
    );
  }

  const runtimeFetchImport =
    runtimeFetchImportKind === 'default'
      ? `import fetchAPI from '${runtimeFetchImportPath}';`
      : runtimeFetchSymbol === 'fetchAPI'
      ? `import { fetchAPI } from '${runtimeFetchImportPath}';`
      : `import { ${runtimeFetchSymbol} as fetchAPI } from '${runtimeFetchImportPath}';`;

  return {
    apiSource: apiLines.join('\n'),
    dtoSource: dtoLines.join('\n').trimEnd(),
    apiImports: [
      runtimeFetchImport,
      `import type { ${Array.from(apiTypeImports).sort((left, right) => left.localeCompare(right)).join(', ')} } from '${dtoImportPath}';`,
    ],
  };
}

function renderTagFolderOutputs({
  spec,
  endpoints = null,
  operations,
  runtimeFetchImportPath,
  runtimeFetchSymbol,
  runtimeFetchImportKind = 'named',
  runtimeCallStyle,
}) {
  const usedNames = new Set();
  const endpointFiles = [];
  const endpointInputs = endpoints ?? operations.map((operation) => {
    const functionName = createUniqueName(
      buildOperationSymbolBase(operation),
      usedNames,
    );

    return {
      operation,
      functionName,
      endpointFileBase: toKebabCase(functionName),
    };
  });

  for (const endpoint of endpointInputs) {
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

    endpointFiles.push({
      endpointFileBase,
      apiSource: [...rendered.apiImports, '', rendered.apiSource, ''].join('\n'),
      dtoSource: `${rendered.dtoSource}\n`,
    });
  }

  return {
    endpointFiles,
  };
}

export {
  renderOperationSection,
  renderTagFolderOutputs,
};
