import path from 'node:path';

import {
  HTTP_METHOD_ORDER,
  buildEndpointCatalog,
  collectRefs,
  createTypeRenderer,
  escapeComment,
  findPrimaryResponse,
  getByRef,
  getOperationParameters,
  getRequestBodySchema,
  getResponseSchema,
  normalizeText,
  toCamelCase,
  toKebabCase,
  toPascalCase,
  quotePropertyName,
  writeText,
} from '../core/openapi-utils.mjs';

function buildTagDirectoryName(tag, tagFileCase = 'title') {
  const normalizedTag = normalizeText(tag) || 'default';

  if (tagFileCase === 'title') {
    const sanitized = normalizedTag
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[. ]+$/g, '');

    return sanitized || 'default';
  }

  return toKebabCase(normalizedTag);
}

function resolveRequestBody(spec, requestBody) {
  if (!requestBody) {
    return null;
  }

  return requestBody.$ref ? getByRef(spec, requestBody.$ref) : requestBody;
}

function resolveResponse(spec, response) {
  if (!response) {
    return null;
  }

  return response.$ref ? getByRef(spec, response.$ref) : response;
}

function isJsonLikeMediaType(mediaType) {
  return (
    mediaType === 'application/json' ||
    mediaType === '*/*' ||
    (typeof mediaType === 'string' && mediaType.endsWith('+json'))
  );
}

function isMultipartMediaType(mediaType) {
  return mediaType === 'multipart/form-data';
}

function collectProjectOperations(spec) {
  const catalogEntries = buildEndpointCatalog(spec);
  const catalogMap = new Map(
    catalogEntries.map((entry) => [`${entry.method} ${entry.path}`, entry]),
  );
  const operations = [];

  for (const endpointPath of Object.keys(spec.paths ?? {}).sort((left, right) =>
    left.localeCompare(right),
  )) {
    const pathItem = spec.paths?.[endpointPath] ?? {};

    for (const method of HTTP_METHOD_ORDER) {
      const operation = pathItem?.[method];

      if (!operation) {
        continue;
      }

      const catalogEntry = catalogMap.get(`${method} ${endpointPath}`);
      const parameters = getOperationParameters(spec, pathItem, operation);
      const requestBody = resolveRequestBody(spec, operation.requestBody);
      const requestContentTypes = Object.keys(requestBody?.content ?? {});
      const [successStatus, successResponseRaw] = findPrimaryResponse(operation.responses ?? {});
      const successResponse = resolveResponse(spec, successResponseRaw);
      const responseContentTypes = Object.keys(successResponse?.content ?? {});
      const tag = operation.tags?.[0] ?? 'default';

      operations.push({
        endpointId: catalogEntry?.id ?? toKebabCase(`${method}-${endpointPath}`),
        method,
        path: endpointPath,
        summary: normalizeText(operation.summary),
        description: normalizeText(operation.description),
        operationId: operation.operationId ?? null,
        parameters,
        requestBody,
        requestContentTypes,
        successStatus,
        successResponse,
        responseContentTypes,
        tag,
      });
    }
  }

  return operations;
}

function validateProjectOperations(operations) {
  for (const operation of operations) {
    const unsupportedReasons = [];

    if (operation.requestContentTypes.length > 1) {
      unsupportedReasons.push('multiple request body media types');
    } else if (
      operation.requestContentTypes.length === 1 &&
      !isJsonLikeMediaType(operation.requestContentTypes[0]) &&
      !isMultipartMediaType(operation.requestContentTypes[0])
    ) {
      unsupportedReasons.push(
        `request media type ${operation.requestContentTypes[0]}`,
      );
    }

    if (!operation.successStatus) {
      unsupportedReasons.push('missing success response');
    }

    if (operation.responseContentTypes.length > 1) {
      unsupportedReasons.push('multiple response media types');
    } else if (
      operation.responseContentTypes.length === 1 &&
      !isJsonLikeMediaType(operation.responseContentTypes[0])
    ) {
      unsupportedReasons.push(
        `response media type ${operation.responseContentTypes[0]}`,
      );
    }

    if (unsupportedReasons.length > 0) {
      throw new Error(
        [
          `Unsupported operation in MVP v2: ${operation.method.toUpperCase()} ${operation.path}`,
          `Reasons: ${unsupportedReasons.join(', ')}`,
        ].join('\n'),
      );
    }
  }
}

function buildPathParamsRequired(parameters) {
  return parameters.some((parameter) => parameter.in === 'path');
}

function buildQueryRequired(parameters) {
  return parameters.some(
    (parameter) => parameter.in === 'query' && parameter.required,
  );
}

function buildHeaderRequired(parameters) {
  return parameters.some(
    (parameter) => parameter.in === 'header' && parameter.required,
  );
}

function buildCookieRequired(parameters) {
  return parameters.some(
    (parameter) => parameter.in === 'cookie' && parameter.required,
  );
}

function hasKind(parameters, requestBody, location) {
  if (location === 'body') {
    return Boolean(requestBody);
  }

  return parameters.some((parameter) => parameter.in === location);
}

function normalizeOperationNameSource(value) {
  const text = normalizeText(value);
  if (!text) {
    return '';
  }

  const withoutHttpVerbSuffix = text.replace(
    /Using(?:GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/i,
    '',
  );
  const withoutControllerPrefix = withoutHttpVerbSuffix.replace(
    /^[A-Za-z0-9]+Controller(?:[_-]|(?=[A-Z]))?/,
    '',
  );

  return withoutControllerPrefix || withoutHttpVerbSuffix || text;
}

function buildOperationSymbolBase(operation) {
  const fallback = normalizeOperationNameSource(operation.operationId) || operation.endpointId;
  return toCamelCase(fallback);
}

function createUniqueName(baseName, usedNames) {
  let candidate = baseName || 'callApi';
  let suffix = 2;

  while (usedNames.has(candidate)) {
    candidate = `${baseName}${suffix}`;
    suffix += 1;
  }

  usedNames.add(candidate);
  return candidate;
}

function toPascalIdentifier(value) {
  if (!value) {
    return 'CallApi';
  }

  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function buildJsDoc(description, indent = '') {
  const text = normalizeText(description);
  if (!text) {
    return [];
  }

  return [
    `${indent}/**`,
    ...text.split('\n').map((line) => `${indent} * ${escapeComment(line)}`),
    `${indent} */`,
  ];
}

function isSimpleObjectSchema(schema) {
  return Boolean(
    schema &&
      (schema.type === 'object' || schema.properties || schema.additionalProperties) &&
      !schema.oneOf &&
      !schema.anyOf &&
      !schema.allOf &&
      !schema.enum,
  );
}

function renderConcreteNamedSchema(name, schema, renderer, description) {
  const lines = [...buildJsDoc(description)];

  if (isSimpleObjectSchema(schema)) {
    const properties = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    lines.push(`export interface ${name} {`);

    for (const [propName, propSchema] of Object.entries(properties)) {
      lines.push(...buildJsDoc(propSchema.description, '  '));
      lines.push(
        `  ${quotePropertyName(propName)}${required.has(propName) ? '' : '?'}: ${renderer.renderType(
          propSchema,
        )};`,
      );
    }

    if (schema.additionalProperties) {
      lines.push(`  [key: string]: ${renderer.renderType(schema.additionalProperties)};`);
    }

    if (Object.keys(properties).length === 0 && !schema.additionalProperties) {
      lines.push('  [key: string]: unknown;');
    }

    lines.push('}');
    return lines.join('\n');
  }

  lines.push(`export type ${name} = ${renderer.renderType(schema)};`);
  return lines.join('\n');
}

function renderParameterDto(parameters, location, name, renderer) {
  const selected = parameters.filter((parameter) => parameter.in === location);

  if (selected.length === 0) {
    return null;
  }

  const lines = [`export interface ${name} {`];

  for (const parameter of selected) {
    lines.push(...buildJsDoc(parameter.description, '  '));
    lines.push(
      `  ${quotePropertyName(parameter.name)}${parameter.required ? '' : '?'}: ${renderer.renderType(
        parameter.schema,
      )};`,
    );
  }

  lines.push('}');
  return lines.join('\n');
}

function resolveSchema(spec, schema) {
  if (!schema) {
    return null;
  }

  return schema.$ref ? getByRef(spec, schema.$ref) : schema;
}

function splitTypeNameTokens(value) {
  return String(value).match(/[A-Z]+(?=[A-Z][a-z]|[0-9]|$)|[A-Z]?[a-z]+|[0-9]+/g) ?? [];
}

function shortenSchemaTypeName(name) {
  const tokens = splitTypeNameTokens(name).filter((token) => token !== 'Dto');
  const used = new Set();
  const compacted = [];

  for (const token of tokens) {
    const normalized = token.toLowerCase();
    if (used.has(normalized)) {
      continue;
    }
    used.add(normalized);
    compacted.push(token);
  }

  return compacted.join('') || toPascalCase(name);
}

function createUniqueTypeName(baseName, usedNames) {
  const normalizedBaseName = toPascalCase(baseName || 'GeneratedType');
  let candidate = normalizedBaseName;
  let index = 2;

  while (usedNames.has(candidate)) {
    candidate = `${normalizedBaseName}${index}`;
    index += 1;
  }

  usedNames.add(candidate);
  return candidate;
}

function buildFieldEntriesFromParameters(parameters, location) {
  return parameters
    .filter((parameter) => parameter.in === location)
    .map((parameter) => ({
      name: parameter.name,
      required: parameter.required,
      schema: parameter.schema,
      description: parameter.description,
    }));
}

function buildFieldEntriesFromSchema(schema) {
  const properties = schema?.properties ?? {};
  const required = new Set(schema?.required ?? []);

  return Object.entries(properties).map(([name, propertySchema]) => ({
    name,
    required: required.has(name),
    schema: propertySchema,
    description: propertySchema.description,
  }));
}

function hasDuplicateFieldNames(entries) {
  const seen = new Set();

  for (const entry of entries) {
    const key = String(entry.name);
    if (seen.has(key)) {
      return true;
    }
    seen.add(key);
  }

  return false;
}

function buildLocalSchemaContext(spec, operation, reservedNames = []) {
  const refs = new Set();

  for (const parameter of operation.parameters ?? []) {
    collectRefs(parameter.schema, refs);
  }

  const requestSchema = resolveSchema(spec, getRequestBodySchema(spec, operation.requestBody));
  const responseSchema = resolveSchema(spec, getResponseSchema(spec, operation.successResponse));

  collectRefs(requestSchema, refs);
  collectRefs(responseSchema, refs);

  const localSchemaNames = new Set(
    Array.from(refs)
      .filter((ref) => typeof ref === 'string' && ref.startsWith('#/components/schemas/'))
      .map((ref) => ref.split('/').at(-1))
      .filter((name) => name && spec.components?.schemas?.[name]),
  );
  const queuedSchemaNames = [...localSchemaNames];

  while (queuedSchemaNames.length > 0) {
    const schemaName = queuedSchemaNames.shift();
    const schema = schemaName ? spec.components?.schemas?.[schemaName] : null;

    if (!schema) {
      continue;
    }

    const nestedRefs = new Set();
    collectRefs(schema, nestedRefs);

    for (const nestedRef of nestedRefs) {
      if (
        typeof nestedRef !== 'string' ||
        !nestedRef.startsWith('#/components/schemas/')
      ) {
        continue;
      }

      const nestedSchemaName = nestedRef.split('/').at(-1);
      if (!nestedSchemaName || !spec.components?.schemas?.[nestedSchemaName]) {
        continue;
      }

      if (localSchemaNames.has(nestedSchemaName)) {
        continue;
      }

      localSchemaNames.add(nestedSchemaName);
      queuedSchemaNames.push(nestedSchemaName);
    }
  }

  const sortedLocalSchemaNames = Array.from(localSchemaNames).sort((left, right) =>
    left.localeCompare(right),
  );

  const usedTypeNames = new Set(reservedNames);
  const schemaNameMap = new Map(
    sortedLocalSchemaNames.map((name) => [
      name,
      createUniqueTypeName(shortenSchemaTypeName(name), usedTypeNames),
    ]),
  );
  const renderer = createTypeRenderer((name) => schemaNameMap.get(name) ?? name);

  return {
    localSchemaNames: sortedLocalSchemaNames,
    schemaNameMap,
    renderer,
  };
}

function renderInlineRequestDtoSource({
  name,
  description,
  fields,
  renderer,
}) {
  const lines = [...buildJsDoc(description), `export interface ${name} {`];

  for (const field of fields) {
    lines.push(...buildJsDoc(field.description, '  '));
    lines.push(
      `  ${quotePropertyName(field.name)}${field.required ? '' : '?'}: ${renderer.renderType(
        field.schema,
      )};`,
    );
  }

  lines.push('}');
  return lines.join('\n');
}

function renderNestedRequestDtoSource({
  name,
  description,
  pathFields,
  queryFields,
  headerFields,
  cookieFields,
  bodyTypeName,
  hasRequestBody,
  bodyRequired,
  renderer,
}) {
  const lines = [...buildJsDoc(description), `export interface ${name} {`];

  const groups = [
    ['pathParams', 'path parameters', pathFields, true],
    ['params', 'query parameters', queryFields, false],
    ['headers', 'header parameters', headerFields, false],
    ['cookies', 'cookie parameters', cookieFields, false],
  ];

  for (const [propertyName, label, fields, required] of groups) {
    if (fields.length === 0) {
      continue;
    }

    lines.push(...buildJsDoc(label, '  '));
    lines.push(`  ${propertyName}${required ? '' : '?'}: {`);
    for (const field of fields) {
      lines.push(...buildJsDoc(field.description, '    '));
      lines.push(
        `    ${quotePropertyName(field.name)}${field.required ? '' : '?'}: ${renderer.renderType(
          field.schema,
        )};`,
      );
    }
    lines.push('  };');
  }

  if (hasRequestBody && bodyTypeName) {
    lines.push(...buildJsDoc('request body', '  '));
    lines.push(`  data${bodyRequired ? '' : '?'}: ${bodyTypeName};`);
  }

  lines.push('}');
  return lines.join('\n');
}

function getDestructuredLocalName(propertyName) {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(propertyName)) {
    return propertyName;
  }

  return toCamelCase(propertyName);
}

function buildPathTemplateExpression(template, getValueExpression) {
  return `\`${template.replace(
    /\{([^}]+)\}/g,
    (_, key) => `\${${getValueExpression(key)}}`,
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
  const requestSchema = resolveSchema(spec, getRequestBodySchema(spec, operation.requestBody));
  const responseSchema = resolveSchema(spec, getResponseSchema(spec, operation.successResponse));
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

  return {
    apiSource: apiLines.join('\n'),
    dtoSource: dtoLines.join('\n').trimEnd(),
    apiImports: [
      `import { ${runtimeFetchSymbol} as fetchAPI } from '${runtimeFetchImportPath}';`,
      `import type { ${Array.from(apiTypeImports).sort((left, right) => left.localeCompare(right)).join(', ')} } from '${dtoImportPath}';`,
    ],
  };
}

function renderTagFolderOutputs({
  spec,
  operations,
  runtimeFetchImportPath,
  runtimeFetchSymbol,
  runtimeCallStyle,
}) {
  const usedNames = new Set();
  const endpointFiles = [];

  for (const operation of operations) {
    const functionName = createUniqueName(
      buildOperationSymbolBase(operation),
      usedNames,
    );
    const endpointFileBase = toKebabCase(functionName);
    const rendered = renderOperationSection({
      spec,
      operation,
      functionName,
      dtoImportPath: `./${endpointFileBase}.dto`,
      runtimeFetchImportPath,
      runtimeFetchSymbol,
      runtimeCallStyle,
    });

    endpointFiles.push({
      endpointFileBase,
      apiSource: [...rendered.apiImports, '', rendered.apiSource, ''].join('\n'),
      dtoSource: `${rendered.dtoSource}\n`,
    });
  }

  const indexLines = [];
  for (const { endpointFileBase } of endpointFiles) {
    indexLines.push(`export * from './${endpointFileBase}.dto';`);
    indexLines.push(`export * from './${endpointFileBase}.api';`);
  }
  indexLines.push('');

  return {
    endpointFiles,
    indexSource: indexLines.join('\n'),
  };
}

function renderIndexSource(tagDirectoryNames) {
  const lines = [`export * from './schema';`];

  for (const tagDirectoryName of tagDirectoryNames) {
    lines.push(`export * from ${JSON.stringify(`./${tagDirectoryName}`)};`);
  }

  lines.push('');
  return lines.join('\n');
}

function renderProjectSummary(manifest) {
  const lines = [
    '# Project Candidate Summary',
    '',
    `- Generated at: ${manifest.generatedAt}`,
    `- Source OpenAPI: ${manifest.sourcePath}`,
    `- Project rules: ${manifest.projectRulesPath}`,
    `- Review schema: ${manifest.generatedSchemaPath}`,
    `- Suggested target root: ${manifest.applyTargetSrcDir}`,
    `- Total endpoints: ${manifest.totalEndpoints}`,
    '',
    '## Generated Files',
    '',
  ];

  for (const entry of manifest.files) {
    lines.push(
      `- [${entry.kind}] \`${entry.generated}\` -> \`${entry.target}\`${entry.summary ? ` (${entry.summary})` : ''}`,
    );
  }

  lines.push('');
  return lines.join('\n');
}

async function writeProjectOutputs({
  rootDir,
  spec,
  schemaSourcePath,
  schemaContents,
  projectGeneratedSrcDir,
  projectManifestPath,
  projectSummaryPath,
  projectRulesPath,
  applyTargetSrcDir,
  generatedSchemaPath,
  apiRules,
  layoutRules,
}) {
  const operations = collectProjectOperations(spec);

  if (operations.length === 0) {
    throw new Error('No endpoints found in OpenAPI spec');
  }

  validateProjectOperations(operations);

  const schemaFileName = layoutRules.schemaFileName ?? 'schema.ts';
  const schemaOutputPath = path.join(projectGeneratedSrcDir, schemaFileName);
  const indexOutputPath = path.join(projectGeneratedSrcDir, 'index.ts');
  const tagFileMap = new Map();
  const manifestFiles = [];

  await writeText(schemaOutputPath, schemaContents);
  manifestFiles.push({
    kind: 'schema',
    generated: path.relative(rootDir, schemaOutputPath).replaceAll(path.sep, '/'),
    target: path
      .join(applyTargetSrcDir, schemaFileName)
      .replaceAll(path.sep, '/'),
  });

  for (const operation of operations) {
    const tagFileName = buildTagDirectoryName(
      operation.tag || 'default',
      apiRules.tagFileCase ?? 'title',
    );
    if (!tagFileMap.has(tagFileName)) {
      tagFileMap.set(tagFileName, []);
    }
    tagFileMap.get(tagFileName).push(operation);
  }

  const sortedTagFileNames = Array.from(tagFileMap.keys()).sort((left, right) =>
    left.localeCompare(right),
  );

  for (const tagFileName of sortedTagFileNames) {
    const tagDirectoryPath = path.join(projectGeneratedSrcDir, tagFileName);
    const tagIndexPath = path.join(tagDirectoryPath, 'index.ts');
    const renderedTag = renderTagFolderOutputs({
      spec,
      operations: tagFileMap.get(tagFileName),
      runtimeFetchImportPath: apiRules.fetchApiImportPath ?? '@/shared/api',
      runtimeFetchSymbol: apiRules.fetchApiSymbol ?? 'fetchAPI',
      runtimeCallStyle: apiRules.adapterStyle === 'request-object' ? 'request-object' : 'url-config',
    });
    for (const endpointFile of renderedTag.endpointFiles) {
      const dtoFilePath = path.join(tagDirectoryPath, `${endpointFile.endpointFileBase}.dto.ts`);
      const apiFilePath = path.join(tagDirectoryPath, `${endpointFile.endpointFileBase}.api.ts`);

      await writeText(dtoFilePath, endpointFile.dtoSource);
      manifestFiles.push({
        kind: 'dto',
        generated: path.relative(rootDir, dtoFilePath).replaceAll(path.sep, '/'),
        target: path
          .join(applyTargetSrcDir, tagFileName, `${endpointFile.endpointFileBase}.dto.ts`)
          .replaceAll(path.sep, '/'),
        summary: `tag=${tagFileName} endpoint=${endpointFile.endpointFileBase}`,
      });

      await writeText(apiFilePath, endpointFile.apiSource);
      manifestFiles.push({
        kind: 'api',
        generated: path.relative(rootDir, apiFilePath).replaceAll(path.sep, '/'),
        target: path
          .join(applyTargetSrcDir, tagFileName, `${endpointFile.endpointFileBase}.api.ts`)
          .replaceAll(path.sep, '/'),
        summary: `tag=${tagFileName} endpoint=${endpointFile.endpointFileBase}`,
      });
    }

    await writeText(tagIndexPath, renderedTag.indexSource);
    manifestFiles.push({
      kind: 'index',
      generated: path.relative(rootDir, tagIndexPath).replaceAll(path.sep, '/'),
      target: path.join(applyTargetSrcDir, tagFileName, 'index.ts').replaceAll(path.sep, '/'),
      summary: `tag=${tagFileName}`,
    });
  }

  await writeText(
    indexOutputPath,
    renderIndexSource(sortedTagFileNames),
  );
  manifestFiles.push({
    kind: 'index',
    generated: path.relative(rootDir, indexOutputPath).replaceAll(path.sep, '/'),
    target: path.join(applyTargetSrcDir, 'index.ts').replaceAll(path.sep, '/'),
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourcePath: path.relative(rootDir, schemaSourcePath).replaceAll(path.sep, '/'),
    generatedSchemaPath,
    projectRulesPath,
    projectGeneratedSrcDir: path.relative(rootDir, projectGeneratedSrcDir).replaceAll(path.sep, '/'),
    applyTargetSrcDir,
    totalEndpoints: operations.length,
    files: manifestFiles,
  };

  await writeText(projectSummaryPath, renderProjectSummary(manifest));

  return manifest;
}

export {
  collectProjectOperations,
  renderProjectSummary,
  validateProjectOperations,
  writeProjectOutputs,
};
