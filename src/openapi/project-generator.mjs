import path from 'node:path';

import {
  HTTP_METHOD_ORDER,
  buildEndpointCatalog,
  findPrimaryResponse,
  getByRef,
  getOperationParameters,
  normalizeText,
  toCamelCase,
  toKebabCase,
  writeText,
} from '../core/openapi-utils.mjs';

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
  pathParams: Record<string, string | number | boolean | null | undefined>,
): string {
  return template.replace(/\\{([^}]+)\\}/g, (_, key) => {
    const value = pathParams[key];

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

function renderOperationSection({
  operation,
  functionName,
}) {
  const operationTypeName = `${functionName}Operation`;
  const queryTypeName = `${functionName}QueryParams`;
  const pathTypeName = `${functionName}PathParams`;
  const headerTypeName = `${functionName}HeaderParams`;
  const cookieTypeName = `${functionName}CookieParams`;
  const bodyTypeName = `${functionName}RequestBody`;
  const responseTypeName = `${functionName}Response`;
  const argsTypeName = `${functionName}Args`;
  const typeRef = buildOperationTypeRef(operation);
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
  const requestContentType = operation.requestContentTypes[0] ?? null;
  const requestBodyHelperType = isMultipartMediaType(requestContentType)
    ? 'MultipartRequestBody'
    : 'JsonRequestBody';
  const lines = [
    `type ${operationTypeName} = ${typeRef};`,
    `type ${responseTypeName} = JsonResponseForStatus<${operationTypeName}, ${renderStatusLiteral(
      operation.successStatus,
    )}>;`,
  ];

  if (hasPathParams) {
    lines.push(`type ${pathTypeName} = PathParams<${operationTypeName}>;`);
  }

  if (hasQueryParams) {
    lines.push(`type ${queryTypeName} = QueryParams<${operationTypeName}>;`);
  }

  if (hasHeaderParams) {
    lines.push(`type ${headerTypeName} = HeaderParams<${operationTypeName}>;`);
  }

  if (hasCookieParams) {
    lines.push(`type ${cookieTypeName} = CookieParams<${operationTypeName}>;`);
  }

  if (hasRequestBody) {
    lines.push(
      `type ${bodyTypeName} = ${requestBodyHelperType}<${operationTypeName}>;`,
    );
  }

  lines.push('');

  if (docText) {
    lines.push('/**');
    for (const docLine of docText.split('\n')) {
      lines.push(` * ${docLine}`);
    }
    lines.push(' */');
  }

  if (activeKinds > 1) {
    lines.push(`interface ${argsTypeName} {`);
    if (hasPathParams) {
      lines.push(`  pathParams${pathRequired ? '' : '?'}: ${pathTypeName};`);
    }
    if (hasQueryParams) {
      lines.push(`  params${queryRequired ? '' : '?'}: ${queryTypeName};`);
    }
    if (hasRequestBody) {
      lines.push(`  data${bodyRequired ? '' : '?'}: ${bodyTypeName};`);
    }
    if (hasHeaderParams) {
      lines.push(`  headers${headerRequired ? '' : '?'}: ${headerTypeName};`);
    }
    if (hasCookieParams) {
      lines.push(`  cookies${cookieRequired ? '' : '?'}: ${cookieTypeName};`);
    }
    lines.push('}');
    lines.push('');
  }

  let signature = '(config?: AxiosRequestConfig)';
  if (activeKinds === 1) {
    if (hasPathParams) {
      signature = `(${pathRequired ? 'pathParams' : 'pathParams?'}: ${pathTypeName}, config?: AxiosRequestConfig)`;
    } else if (hasQueryParams) {
      signature = `(${queryRequired ? 'params' : 'params?'}: ${queryTypeName}, config?: AxiosRequestConfig)`;
    } else if (hasRequestBody) {
      signature = `(${bodyRequired ? 'data' : 'data?'}: ${bodyTypeName}, config?: AxiosRequestConfig)`;
    } else if (hasHeaderParams) {
      signature = `(${headerRequired ? 'headers' : 'headers?'}: ${headerTypeName}, config?: AxiosRequestConfig)`;
    } else if (hasCookieParams) {
      signature = `(${cookieRequired ? 'cookies' : 'cookies?'}: ${cookieTypeName}, config?: AxiosRequestConfig)`;
    }
  } else if (activeKinds > 1) {
    signature = `(args: ${argsTypeName}, config?: AxiosRequestConfig)`;
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

  lines.push(
    `const ${functionName} = async ${signature}: Promise<${responseTypeName}> => {`,
    `  return fetchAPI<${responseTypeName}>(${endpointExpression}, {`,
    ...configEntries.map((entry) => `    ${entry},`),
    '  });',
    '};',
    '',
    `export { ${functionName} };`,
  );

  return {
    source: lines.join('\n'),
    imports: [
      `import { fetchAPI, type AxiosRequestConfig } from '../_internal/fetch-api-adapter';`,
      `import type { paths } from '../schema';`,
      `import type { CookieParams, HeaderParams, JsonRequestBody, JsonResponseForStatus, MultipartRequestBody, PathParams, QueryParams } from '../_internal/type-helpers';`,
      `import { buildPath, mergeRequestHeaders } from '../_internal/type-helpers';`,
    ],
  };
}

function renderTagWrapperSource({
  tag,
  operations,
}) {
  const usedNames = new Set();
  const sections = [];
  const importSet = new Set();

  for (const operation of operations) {
    const functionName = createUniqueName(
      buildOperationSymbolBase(operation),
      usedNames,
    );
    const rendered = renderOperationSection({
      operation,
      functionName,
    });

    for (const importLine of rendered.imports) {
      importSet.add(importLine);
    }

    sections.push(rendered.source);
  }

  const lines = [
    ...Array.from(importSet),
    '',
    `// Tag wrapper: ${tag}`,
    '',
    sections.join('\n\n'),
    '',
  ];

  return lines.join('\n');
}

function renderIndexSource(tagFileNames) {
  const lines = [`export * from './schema';`];

  for (const tagFileName of tagFileNames) {
    lines.push(`export * from './apis/${tagFileName}';`);
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
  const apiDirName = layoutRules.apiDirName ?? 'apis';
  const schemaOutputPath = path.join(projectGeneratedSrcDir, schemaFileName);
  const apiOutputDir = path.join(projectGeneratedSrcDir, apiDirName);
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
    const tagFileName = toKebabCase(operation.tag || 'default');
    if (!tagFileMap.has(tagFileName)) {
      tagFileMap.set(tagFileName, []);
    }
    tagFileMap.get(tagFileName).push(operation);
  }

  const sortedTagFileNames = Array.from(tagFileMap.keys()).sort((left, right) =>
    left.localeCompare(right),
  );

  for (const tagFileName of sortedTagFileNames) {
    const source = renderTagWrapperSource({
      tag: tagFileName,
      operations: tagFileMap.get(tagFileName),
    });
    const filePath = path.join(apiOutputDir, `${tagFileName}.ts`);

    await writeText(filePath, source);

    manifestFiles.push({
      kind: 'api',
      generated: path.relative(rootDir, filePath).replaceAll(path.sep, '/'),
      target: path
        .join(applyTargetSrcDir, apiDirName, `${tagFileName}.ts`)
        .replaceAll(path.sep, '/'),
      summary: `tag=${tagFileName}`,
    });
  }

  await writeText(indexOutputPath, renderIndexSource(sortedTagFileNames));
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
