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

function buildOperationSymbolBase(operation) {
  const fallback = operation.operationId || operation.endpointId;
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

function collectOperationSchemaNames(spec, operation) {
  const names = new Set(
    Array.from(
      collectRefs(
        {
          parameters: operation.parameters ?? [],
          requestBody: operation.requestBody ?? {},
          successResponse: operation.successResponse ?? {},
        },
        new Set(),
      ),
    )
      .filter((ref) => typeof ref === 'string' && ref.startsWith('#/components/schemas/'))
      .map((ref) => ref.split('/').at(-1))
      .filter((name) => name && spec.components?.schemas?.[name]),
  );
  const queue = [...names];

  while (queue.length > 0) {
    const name = queue.shift();
    const schema = spec.components?.schemas?.[name];

    if (!schema) {
      continue;
    }

    for (const nestedRef of collectRefs(schema, new Set())) {
      if (typeof nestedRef !== 'string' || !nestedRef.startsWith('#/components/schemas/')) {
        continue;
      }

      const nestedName = nestedRef.split('/').at(-1);
      if (!nestedName || names.has(nestedName) || !spec.components?.schemas?.[nestedName]) {
        continue;
      }

      names.add(nestedName);
      queue.push(nestedName);
    }
  }

  return Array.from(names);
}

function buildLocalSchemaContext(spec, operation, dtoBaseName) {
  const localSchemaNames = Array.from(new Set(collectOperationSchemaNames(spec, operation))).sort(
    (left, right) => left.localeCompare(right),
  );
  const schemaNameMap = new Map(
    localSchemaNames.map((name) => [name, `${dtoBaseName}${toPascalCase(name)}`]),
  );
  const renderer = createTypeRenderer((name) => schemaNameMap.get(name) ?? name);

  return {
    localSchemaNames,
    schemaNameMap,
    renderer,
  };
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

function buildOperationTypeRef(operation) {
  return `paths[${JSON.stringify(operation.path)}][${JSON.stringify(operation.method)}]`;
}

function renderStatusLiteral(status) {
  if (/^\d+$/.test(String(status))) {
    return String(Number(status));
  }

  return JSON.stringify(status);
}

function renderTypeHelpersSource() {
  return `type WildcardContent = {
  "*/*": unknown;
};

type JsonContent = {
  "application/json": unknown;
};

type MultipartContent = {
  "multipart/form-data": unknown;
};

type PlusJsonContent = {
  [key: \`\${string}+json\`]: unknown;
};

type ExtractJsonPayload<Content> =
  Content extends JsonContent
    ? Content["application/json"]
    : Content extends WildcardContent
      ? Content["*/*"]
      : Content extends PlusJsonContent
        ? Content[keyof Content & \`\${string}+json\`]
        : never;

type ExtractMultipartPayload<Content> =
  Content extends MultipartContent
    ? Content["multipart/form-data"]
    : never;

export type PathParams<Operation> =
  Operation extends { parameters: infer Params }
    ? Params extends { path?: infer T }
      ? T
      : never
    : never;

export type QueryParams<Operation> =
  Operation extends { parameters: infer Params }
    ? Params extends { query?: infer T }
      ? T
      : never
    : never;

export type HeaderParams<Operation> =
  Operation extends { parameters: infer Params }
    ? Params extends { header?: infer T }
      ? T
      : never
    : never;

export type CookieParams<Operation> =
  Operation extends { parameters: infer Params }
    ? Params extends { cookie?: infer T }
      ? T
      : never
    : never;

export type JsonRequestBody<Operation> =
  Operation extends { requestBody?: infer Body }
    ? Body extends { content: infer Content }
      ? ExtractJsonPayload<Content>
      : never
    : never;

export type MultipartRequestBody<Operation> =
  Operation extends { requestBody?: infer Body }
    ? Body extends { content: infer Content }
      ? ExtractMultipartPayload<Content>
      : never
    : never;

export type JsonResponseForStatus<Operation, Status extends PropertyKey> =
  Operation extends { responses: infer Responses }
    ? Status extends keyof Responses
      ? Responses[Status] extends { content: infer Content }
        ? [ExtractJsonPayload<Content>] extends [never]
          ? void
          : ExtractJsonPayload<Content>
        : void
      : never
    : never;

export function buildPath(
  template: string,
  pathParams: object,
): string {
  const source = pathParams as Record<string, string | number | boolean | null | undefined>;

  return template.replace(/\\{([^}]+)\\}/g, (_, key) => {
    const value = source[key];

    if (value === undefined || value === null) {
      throw new Error(\`Missing path parameter: \${key}\`);
    }

    return encodeURIComponent(String(value));
  });
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toHeaderRecord(value: unknown): Record<string, string> {
  if (!isObjectRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined && item !== null)
      .map(([key, item]) => [key, String(item)]),
  );
}

export function buildCookieHeader(
  cookieParams: Record<string, string | number | boolean | null | undefined> | undefined,
): string | undefined {
  if (!cookieParams) {
    return undefined;
  }

  const entries = Object.entries(cookieParams)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));

  return entries.length > 0 ? entries.join('; ') : undefined;
}

export function mergeRequestHeaders(
  baseHeaders: unknown,
  headerParams: unknown,
  cookieParams: Record<string, string | number | boolean | null | undefined> | undefined,
): Record<string, string> | undefined {
  const mergedHeaders = {
    ...toHeaderRecord(baseHeaders),
    ...toHeaderRecord(headerParams),
  };
  const cookieHeader = buildCookieHeader(cookieParams);

  if (!cookieHeader) {
    return Object.keys(mergedHeaders).length > 0 ? mergedHeaders : undefined;
  }

  const existingCookie =
    typeof mergedHeaders.Cookie === 'string'
      ? mergedHeaders.Cookie
      : typeof mergedHeaders.cookie === 'string'
        ? mergedHeaders.cookie
        : undefined;

  mergedHeaders.Cookie = existingCookie ? existingCookie + '; ' + cookieHeader : cookieHeader;

  return mergedHeaders;
}
`;
}

function renderAdapterSource({
  runtimeFetchImportPath,
  runtimeFetchSymbol,
  runtimeConfigImportPath,
  runtimeConfigTypeName,
  adapterStyle,
}) {
  const importLines = [];

  if (runtimeConfigImportPath === runtimeFetchImportPath) {
    importLines.push(
      `import { ${runtimeFetchSymbol} as runtimeFetchAPI, type ${runtimeConfigTypeName} as RuntimeRequestConfig } from '${runtimeFetchImportPath}';`,
    );
  } else {
    importLines.push(
      `import { ${runtimeFetchSymbol} as runtimeFetchAPI } from '${runtimeFetchImportPath}';`,
    );
    importLines.push(
      `import type { ${runtimeConfigTypeName} as RuntimeRequestConfig } from '${runtimeConfigImportPath}';`,
    );
  }

  const callExpression =
    adapterStyle === 'request-object'
      ? `runtimeFetchAPI<T>({ url, ...config })`
      : `runtimeFetchAPI<T>(url, config)`;

  return [
    ...importLines,
    '',
    'export type AxiosRequestConfig = RuntimeRequestConfig;',
    '',
    'export async function fetchAPI<T>(',
    '  url: string,',
    '  config: AxiosRequestConfig,',
    '): Promise<T> {',
    `  return ${callExpression};`,
    '}',
    '',
  ].join('\n');
}

function renderOperationSection({ spec, operation, functionName, dtoImportPath }) {
  const dtoBaseName = toPascalIdentifier(functionName);
  const queryTypeName = `${dtoBaseName}QueryParamsDto`;
  const pathTypeName = `${dtoBaseName}PathParamsDto`;
  const headerTypeName = `${dtoBaseName}HeaderParamsDto`;
  const cookieTypeName = `${dtoBaseName}CookieParamsDto`;
  const bodyTypeName = `${dtoBaseName}RequestDto`;
  const responseTypeName = `${dtoBaseName}ResponseDto`;
  const argsTypeName = `${dtoBaseName}ArgsDto`;
  const hasPathParams = hasKind(operation.parameters, null, 'path');
  const hasQueryParams = hasKind(operation.parameters, null, 'query');
  const hasHeaderParams = hasKind(operation.parameters, null, 'header');
  const hasCookieParams = hasKind(operation.parameters, null, 'cookie');
  const hasRequestBody = hasKind([], operation.requestBody, 'body');
  const activeKinds = [
    hasPathParams,
    hasQueryParams,
    hasHeaderParams,
    hasCookieParams,
    hasRequestBody,
  ].filter(Boolean).length;
  const pathRequired = buildPathParamsRequired(operation.parameters);
  const queryRequired = buildQueryRequired(operation.parameters);
  const headerRequired = buildHeaderRequired(operation.parameters);
  const cookieRequired = buildCookieRequired(operation.parameters);
  const bodyRequired = Boolean(operation.requestBody?.required);
  const docText = normalizeText(operation.summary || operation.description);
  const requestSchema = getRequestBodySchema(spec, operation.requestBody);
  const responseSchema = getResponseSchema(spec, operation.successResponse);
  const schemaContext = buildLocalSchemaContext(spec, operation, dtoBaseName);
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

  const pathDtoSource = hasPathParams
    ? renderParameterDto(operation.parameters, 'path', pathTypeName, schemaContext.renderer)
    : null;
  const queryDtoSource = hasQueryParams
    ? renderParameterDto(operation.parameters, 'query', queryTypeName, schemaContext.renderer)
    : null;
  const headerDtoSource = hasHeaderParams
    ? renderParameterDto(operation.parameters, 'header', headerTypeName, schemaContext.renderer)
    : null;
  const cookieDtoSource = hasCookieParams
    ? renderParameterDto(operation.parameters, 'cookie', cookieTypeName, schemaContext.renderer)
    : null;

  for (const block of [pathDtoSource, queryDtoSource, headerDtoSource, cookieDtoSource]) {
    if (!block) {
      continue;
    }
    dtoLines.push(block);
    dtoLines.push('');
  }

  if (hasRequestBody && requestSchema) {
    dtoLines.push(
      renderConcreteNamedSchema(
        bodyTypeName,
        requestSchema,
        schemaContext.renderer,
        operation.requestBody?.description ?? docText,
      ),
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

  if (activeKinds > 1) {
    dtoLines.push(...buildJsDoc(docText));
    dtoLines.push(`export interface ${argsTypeName} {`);
    if (hasPathParams) {
      dtoLines.push(`  pathParams${pathRequired ? '' : '?'}: ${pathTypeName};`);
    }
    if (hasQueryParams) {
      dtoLines.push(`  params${queryRequired ? '' : '?'}: ${queryTypeName};`);
    }
    if (hasRequestBody) {
      dtoLines.push(`  data${bodyRequired ? '' : '?'}: ${bodyTypeName};`);
    }
    if (hasHeaderParams) {
      dtoLines.push(`  headers${headerRequired ? '' : '?'}: ${headerTypeName};`);
    }
    if (hasCookieParams) {
      dtoLines.push(`  cookies${cookieRequired ? '' : '?'}: ${cookieTypeName};`);
    }
    dtoLines.push('}');
    dtoLines.push('');
  }

  const apiLines = [];
  if (docText) {
    apiLines.push('/**');
    for (const docLine of docText.split('\n')) {
      apiLines.push(` * ${docLine}`);
    }
    apiLines.push(' */');
  }

  let signature = '(config?: AxiosRequestConfig)';
  const apiTypeImports = new Set([responseTypeName]);

  if (activeKinds === 1) {
    if (hasPathParams) {
      signature = `(${pathRequired ? 'pathParams' : 'pathParams?'}: ${pathTypeName}, config?: AxiosRequestConfig)`;
      apiTypeImports.add(pathTypeName);
    } else if (hasQueryParams) {
      signature = `(${queryRequired ? 'params' : 'params?'}: ${queryTypeName}, config?: AxiosRequestConfig)`;
      apiTypeImports.add(queryTypeName);
    } else if (hasRequestBody) {
      signature = `(${bodyRequired ? 'data' : 'data?'}: ${bodyTypeName}, config?: AxiosRequestConfig)`;
      apiTypeImports.add(bodyTypeName);
    } else if (hasHeaderParams) {
      signature = `(${headerRequired ? 'headers' : 'headers?'}: ${headerTypeName}, config?: AxiosRequestConfig)`;
      apiTypeImports.add(headerTypeName);
    } else if (hasCookieParams) {
      signature = `(${cookieRequired ? 'cookies' : 'cookies?'}: ${cookieTypeName}, config?: AxiosRequestConfig)`;
      apiTypeImports.add(cookieTypeName);
    }
  } else if (activeKinds > 1) {
    signature = `(args: ${argsTypeName}, config?: AxiosRequestConfig)`;
    apiTypeImports.add(argsTypeName);
  }

  const endpointExpression = hasPathParams
    ? `buildPath(${JSON.stringify(operation.path)}, ${activeKinds === 1 ? 'pathParams' : 'args.pathParams'})`
    : JSON.stringify(operation.path);

  const configEntries = ['...(config ?? {})', `method: ${JSON.stringify(operation.method.toUpperCase())}`];

  if (hasQueryParams) {
    configEntries.push(`params: ${activeKinds === 1 ? 'params' : 'args.params'}`);
  }

  if (hasRequestBody) {
    configEntries.push(`data: ${activeKinds === 1 ? 'data' : 'args.data'}`);
  }

  if (hasHeaderParams || hasCookieParams) {
    const headerExpression = hasHeaderParams
      ? activeKinds === 1
        ? 'headers'
        : 'args.headers'
      : 'undefined';
    const cookieExpression = hasCookieParams
      ? activeKinds === 1
        ? 'cookies'
        : 'args.cookies'
      : 'undefined';
    configEntries.push(
      `headers: mergeRequestHeaders(config?.headers, ${headerExpression}, ${cookieExpression})`,
    );
  }

  apiLines.push(
    `const ${functionName} = async ${signature}: Promise<${responseTypeName}> => {`,
    `  return fetchAPI<${responseTypeName}>(${endpointExpression}, {`,
    ...configEntries.map((entry) => `    ${entry},`),
    '  });',
    '};',
    '',
    `export { ${functionName} };`,
  );

  return {
    apiSource: apiLines.join('\n'),
    dtoSource: dtoLines.join('\n').trimEnd(),
    apiImports: [
      `import { fetchAPI, type AxiosRequestConfig } from '../_internal/fetch-api-adapter';`,
      `import type { ${Array.from(apiTypeImports).sort((left, right) => left.localeCompare(right)).join(', ')} } from '${dtoImportPath}';`,
      `import { buildPath, mergeRequestHeaders } from '../_internal/type-helpers';`,
    ],
  };
}

function renderTagFolderOutputs({ spec, tag, operations }) {
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
    `- Apply target root: ${manifest.applyTargetSrcDir}`,
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
  const helperOutputPath = path.join(projectGeneratedSrcDir, '_internal', 'type-helpers.ts');
  const adapterOutputPath = path.join(projectGeneratedSrcDir, '_internal', 'fetch-api-adapter.ts');
  const indexOutputPath = path.join(projectGeneratedSrcDir, 'index.ts');
  const tagFileMap = new Map();
  const manifestFiles = [];
  const adapterStyle = apiRules.adapterStyle ?? 'url-config';

  await writeText(schemaOutputPath, schemaContents);
  manifestFiles.push({
    kind: 'schema',
    generated: path.relative(rootDir, schemaOutputPath).replaceAll(path.sep, '/'),
    target: path
      .join(applyTargetSrcDir, schemaFileName)
      .replaceAll(path.sep, '/'),
  });

  await writeText(helperOutputPath, renderTypeHelpersSource());
  manifestFiles.push({
    kind: 'internal',
    generated: path.relative(rootDir, helperOutputPath).replaceAll(path.sep, '/'),
    target: path
      .join(applyTargetSrcDir, '_internal', 'type-helpers.ts')
      .replaceAll(path.sep, '/'),
  });

  await writeText(
    adapterOutputPath,
    renderAdapterSource({
      runtimeFetchImportPath: apiRules.fetchApiImportPath ?? '@/shared/api',
      runtimeFetchSymbol: apiRules.fetchApiSymbol ?? 'fetchAPI',
      runtimeConfigImportPath: apiRules.axiosConfigImportPath ?? 'axios',
      runtimeConfigTypeName: apiRules.axiosConfigTypeName ?? 'AxiosRequestConfig',
      adapterStyle,
    }),
  );
  manifestFiles.push({
    kind: 'internal',
    generated: path.relative(rootDir, adapterOutputPath).replaceAll(path.sep, '/'),
    target: path
      .join(applyTargetSrcDir, '_internal', 'fetch-api-adapter.ts')
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
      tag: tagFileName,
      operations: tagFileMap.get(tagFileName),
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
  renderTypeHelpersSource,
  validateProjectOperations,
  writeProjectOutputs,
};
