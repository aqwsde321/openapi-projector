import path from 'node:path';

import {
  buildEndpointCatalog,
  cleanDir,
  collectRefs,
  collectSchemaRefsFromOperation,
  createTypeRenderer,
  escapeComment,
  findPrimaryResponse,
  getByRef,
  getOperationParameters,
  getRequestBodyMediaType,
  getRequestBodySchema,
  getResponseSchema,
  loadProjectConfig,
  loadProjectRules,
  normalizeText,
  quotePropertyName,
  readJson,
  toCamelCase,
  toKebabCase,
  toPascalCase,
  writeJson,
  writeText,
} from '../core/openapi-utils.mjs';

let rootDir;
let projectConfig;
let projectRules;
let sourcePath;
let projectGeneratedSrcDir;
let projectRootDir;
let projectEndpointsDir;
let projectManifestPath;
let projectSummaryPath;
let apiRules;
let typeRules;
let generationRules;
let fetchApiImportPath;
let fetchApiSymbol;
let axiosConfigImportPath;
let axiosConfigTypeName;
let commonTypesImportPath;
let responseTypeName;
let pagedResponseTypeName;
let queryFlattenStrategy;
let responseWrapperStrategy;
let multipartStrategy;
let spec;
let endpoints;

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

function toPosixRelativePath(fromDir, toFilePath) {
  const relativePath = path.relative(fromDir, toFilePath).replaceAll(path.sep, '/');
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

function resolveRequestBody(requestBody) {
  if (!requestBody) {
    return null;
  }

  return requestBody.$ref ? getByRef(spec, requestBody.$ref) : requestBody;
}

function dereferenceSchema(schema) {
  if (!schema) {
    return [null, null];
  }

  if (!schema.$ref) {
    return [schema, null];
  }

  const refName = schema.$ref.split('/').at(-1);
  return [getByRef(spec, schema.$ref), refName];
}

function collectEndpointSchemaNames(pathItem, operation) {
  const names = new Set(collectSchemaRefsFromOperation(spec, pathItem, operation));
  const queue = [...names];

  while (queue.length > 0) {
    const name = queue.shift();
    const schema = spec.components?.schemas?.[name];

    if (!schema) {
      continue;
    }

    const refs = collectRefs(schema, new Set());
    for (const ref of refs) {
      if (!ref.startsWith('#/components/schemas/')) {
        continue;
      }

      const nestedName = ref.split('/').at(-1);
      if (!nestedName || names.has(nestedName)) {
        continue;
      }

      names.add(nestedName);
      queue.push(nestedName);
    }
  }

  return Array.from(names).sort((left, right) => left.localeCompare(right));
}

function buildLocalSchemaContext(endpoint, pathItem, operation) {
  const prefix = toPascalCase(endpoint.id ?? `${endpoint.method}-${endpoint.path}`);
  const localSchemaNames = collectEndpointSchemaNames(pathItem, operation);
  const schemaNameMap = new Map(
    localSchemaNames.map((name) => [name, `${prefix}${toPascalCase(name)}`]),
  );
  const renderer = createTypeRenderer((name) => schemaNameMap.get(name) ?? name);

  return {
    prefix,
    localSchemaNames,
    schemaNameMap,
    renderer,
  };
}

function renderNamedSchema(localName, schema, renderer) {
  const description = normalizeText(schema.description);
  const lines = [...buildJsDoc(description)];
  const hasSimpleObject =
    (schema.type === 'object' || schema.properties || schema.additionalProperties) &&
    !schema.oneOf &&
    !schema.anyOf &&
    !schema.allOf &&
    !schema.enum;

  if (hasSimpleObject) {
    const properties = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    lines.push(`export interface ${localName} {`);

    for (const [propName, propSchema] of Object.entries(properties)) {
      lines.push(...buildJsDoc(propSchema.description, '  '));
      lines.push(
        `  ${quotePropertyName(propName)}${required.has(propName) ? '' : '?'}: ${renderer.renderType(
          propSchema,
        )};`,
      );
    }

    if (schema.additionalProperties) {
      lines.push(
        `  [key: string]: ${renderer.renderType(schema.additionalProperties)};`,
      );
    }

    if (Object.keys(properties).length === 0 && !schema.additionalProperties) {
      lines.push('  [key: string]: unknown;');
    }

    lines.push('}');
    return lines.join('\n');
  }

  lines.push(`export type ${localName} = ${renderer.renderType(schema)};`);
  return lines.join('\n');
}

function getDefaultStyle(location) {
  switch (location) {
    case 'path':
    case 'header':
      return 'simple';
    case 'query':
    case 'cookie':
    default:
      return 'form';
  }
}

function getParameterStyle(parameter) {
  return parameter.style || getDefaultStyle(parameter.in);
}

function getParameterExplode(parameter, styleValue) {
  if (parameter.explode !== undefined) {
    return Boolean(parameter.explode);
  }

  return styleValue === 'form';
}

function flattenQueryFields(parameters) {
  const fields = [];

  for (const parameter of parameters.filter((item) => item.in === 'query')) {
    const style = getParameterStyle(parameter);
    const explode = getParameterExplode(parameter, style);
    const [resolvedSchema] = dereferenceSchema(parameter.schema);
    const schema = resolvedSchema ?? parameter.schema;

    if (
      queryFlattenStrategy === 'form_explode_object' &&
      style === 'form' &&
      explode &&
      schema &&
      (schema.type === 'object' || schema.properties)
    ) {
      const required = new Set(schema.required ?? []);
      for (const [propName, propSchema] of Object.entries(schema.properties ?? {})) {
        fields.push({
          name: propName,
          schema: propSchema,
          required: required.has(propName),
        });
      }
      continue;
    }

    fields.push({
      name: parameter.name,
      schema: parameter.schema,
      required: Boolean(parameter.required),
    });
  }

  return fields;
}

function buildFlatParamsDto(parameters, prefix, renderer) {
  const fields = flattenQueryFields(parameters);

  if (fields.length === 0) {
    return null;
  }

  const lines = [`export interface ${prefix}ParamsDto {`];

  for (const field of fields) {
    lines.push(...buildJsDoc(field.schema.description, '  '));
    lines.push(
      `  ${quotePropertyName(field.name)}${field.required ? '' : '?'}: ${renderer.renderType(
        field.schema,
      )};`,
    );
  }

  lines.push('}');
  return lines.join('\n');
}

function buildParameterObject(parameters, location, name, renderer) {
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

function resolveResponseEnvelope(schema) {
  const [resolved] = dereferenceSchema(schema);
  const current = resolved ?? schema;

  if (!current || current.type !== 'object' || !current.properties) {
    return null;
  }

  const keys = Object.keys(current.properties);
  if (
    current.properties.status &&
    current.properties.message &&
    current.properties.data &&
    keys.every((key) => ['status', 'message', 'data'].includes(key))
  ) {
    return current.properties.data;
  }

  return null;
}

function resolvePagedItemSchema(schema) {
  const [resolved] = dereferenceSchema(schema);
  const current = resolved ?? schema;

  if (!current || current.type !== 'object' || !current.properties?.content || !current.properties?.page) {
    return null;
  }

  const contentSchema = current.properties.content;
  const [resolvedContent] = dereferenceSchema(contentSchema);
  const normalizedContent = resolvedContent ?? contentSchema;

  if (normalizedContent?.type !== 'array' || !normalizedContent.items) {
    return null;
  }

  return normalizedContent.items;
}

function buildProjectResponseType(primaryResponseSchema, renderer) {
  if (responseWrapperStrategy !== 'jsend_to_response') {
    return {
      typeExpression: renderer.renderType(primaryResponseSchema),
      wrapperImport: null,
    };
  }

  if (!primaryResponseSchema) {
    return {
      typeExpression: 'unknown',
      wrapperImport: null,
    };
  }

  const dataSchema = resolveResponseEnvelope(primaryResponseSchema);
  if (!dataSchema) {
    return {
      typeExpression: renderer.renderType(primaryResponseSchema),
      wrapperImport: null,
    };
  }

  const pagedItemSchema = resolvePagedItemSchema(dataSchema);
  if (pagedItemSchema) {
    return {
      typeExpression: `${pagedResponseTypeName}<${renderer.renderType(pagedItemSchema)}>`,
      wrapperImport: pagedResponseTypeName,
    };
  }

  return {
    typeExpression: `${responseTypeName}<${renderer.renderType(dataSchema)}>`,
    wrapperImport: responseTypeName,
  };
}

function buildProjectDtoFile(endpoint) {
  const method = endpoint.method.toLowerCase();
  const pathItem = spec.paths?.[endpoint.path];
  const operation = pathItem?.[method];

  if (!pathItem || !operation) {
    throw new Error(`Endpoint missing in OpenAPI spec: ${method.toUpperCase()} ${endpoint.path}`);
  }

  const context = buildLocalSchemaContext(endpoint, pathItem, operation);
  const parameters = getOperationParameters(spec, pathItem, operation);
  const requestSchema = getRequestBodySchema(spec, operation.requestBody);
  const [, primaryResponse] = findPrimaryResponse(operation.responses);
  const primaryResponseSchema = getResponseSchema(spec, primaryResponse);
  const responseType = buildProjectResponseType(primaryResponseSchema, context.renderer);
  const imports = [];

  if (responseType.wrapperImport) {
    imports.push(responseType.wrapperImport);
  }

  const sections = [
    '// Project-ready DTO candidate. Review under openapi/project before apply.',
  ];

  if (imports.length > 0) {
    sections.push(
      `import type { ${Array.from(new Set(imports)).join(', ')} } from '${commonTypesImportPath}';`,
    );
  }

  if (context.localSchemaNames.length > 0) {
    sections.push(
      '// Local schemas referenced by this endpoint',
      ...context.localSchemaNames.map((name) =>
        renderNamedSchema(
          context.schemaNameMap.get(name) ?? name,
          spec.components.schemas[name],
          context.renderer,
        ),
      ),
    );
  }

  const operationSections = [];
  const summaryDoc = buildJsDoc(operation.summary || operation.description).join('\n');
  if (summaryDoc) {
    operationSections.push(summaryDoc);
  }

  const pathParamsBlock = buildParameterObject(
    parameters,
    'path',
    `${context.prefix}PathParamsDto`,
    context.renderer,
  );
  if (pathParamsBlock) {
    operationSections.push(pathParamsBlock);
  }

  const headersBlock = buildParameterObject(
    parameters,
    'header',
    `${context.prefix}HeadersDto`,
    context.renderer,
  );
  if (headersBlock) {
    operationSections.push(headersBlock);
  }

  const paramsBlock = buildFlatParamsDto(parameters, context.prefix, context.renderer);
  if (paramsBlock) {
    operationSections.push(paramsBlock);
  }

  if (requestSchema) {
    operationSections.push(
      `export type ${context.prefix}RequestDto = ${context.renderer.renderType(requestSchema)};`,
    );
  }

  operationSections.push(
    `export type ${context.prefix}ResponseDto = ${responseType.typeExpression};`,
  );

  sections.push('// Project DTO candidate', ...operationSections);

  return `${sections.filter(Boolean).join('\n\n')}\n`;
}

function buildPathTemplateBuilder(prefix, pathConstantName) {
  return [
    `function build${prefix}Path(pathParams: ${prefix}PathParamsDto): string {`,
    `  return ${pathConstantName}.replace(/\\{([^}]+)\\}/g, (_, key: string) => {`,
    '    const value = pathParams[key as keyof typeof pathParams];',
    '    if (value === undefined || value === null) {',
    '      throw new Error(`Missing path param: ${key}`);',
    '    }',
    '    return encodeURIComponent(String(value));',
    '  });',
    '}',
  ].join('\n');
}

function buildMultipartRuntimeHelpersSource() {
  return [
    'function appendFormDataEntry(formData: FormData, key: string, value: unknown): void {',
    '  if (value === undefined || value === null) {',
    '    return;',
    '  }',
    '',
    '  if (Array.isArray(value)) {',
    '    for (const item of value) {',
    '      appendFormDataEntry(formData, key, item);',
    '    }',
    '    return;',
    '  }',
    '',
    '  if (typeof Blob !== \'undefined\' && value instanceof Blob) {',
    '    formData.append(key, value);',
    '    return;',
    '  }',
    '',
    '  if (value instanceof Date) {',
    '    formData.append(key, value.toISOString());',
    '    return;',
    '  }',
    '',
    '  if (typeof value === \'object\') {',
    '    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {',
    '      appendFormDataEntry(formData, `${key}[${childKey}]`, childValue);',
    '    }',
    '    return;',
    '  }',
    '',
    '  formData.append(key, String(value));',
    '}',
    '',
    'function buildMultipartFormData(body: Record<string, unknown>): FormData {',
    '  const formData = new FormData();',
    '  for (const [key, value] of Object.entries(body)) {',
    '    appendFormDataEntry(formData, key, value);',
    '  }',
    '  return formData;',
    '}',
  ].join('\n');
}

function buildProjectApiFile(endpoint) {
  const method = endpoint.method.toLowerCase();
  const pathItem = spec.paths?.[endpoint.path];
  const operation = pathItem?.[method];

  if (!pathItem || !operation) {
    throw new Error(`Endpoint missing in OpenAPI spec: ${method.toUpperCase()} ${endpoint.path}`);
  }

  const prefix = toPascalCase(endpoint.id ?? `${endpoint.method}-${endpoint.path}`);
  const functionName = toCamelCase(endpoint.id ?? `${endpoint.method}-${endpoint.path}`);
  const dtoImports = [`${prefix}ResponseDto`];
  const parameters = getOperationParameters(spec, pathItem, operation);
  const requestBodySchema = getRequestBodySchema(spec, operation.requestBody);
  const requestBodyMediaType = getRequestBodyMediaType(spec, operation.requestBody);
  const requestBodyKind =
    requestBodyMediaType === 'multipart/form-data'
      ? 'multipart'
      : requestBodyMediaType === 'application/json' || requestBodyMediaType?.endsWith('+json')
        ? 'json'
        : requestBodyMediaType
          ? 'raw'
          : null;

  const hasPathParams = parameters.some((parameter) => parameter.in === 'path');
  const hasHeaderParams = parameters.some((parameter) => parameter.in === 'header');
  const hasQueryParams = flattenQueryFields(parameters).length > 0;
  const hasRequestBody = Boolean(requestBodySchema);
  const hasCookieParams = parameters.some((parameter) => parameter.in === 'cookie');

  if (hasPathParams) {
    dtoImports.push(`${prefix}PathParamsDto`);
  }
  if (hasHeaderParams) {
    dtoImports.push(`${prefix}HeadersDto`);
  }
  if (hasQueryParams) {
    dtoImports.push(`${prefix}ParamsDto`);
  }
  if (hasRequestBody) {
    dtoImports.push(`${prefix}RequestDto`);
  }

  const sections = [
    `import type { ${axiosConfigTypeName} } from '${axiosConfigImportPath}';`,
    `import { ${fetchApiSymbol} } from '${fetchApiImportPath}';`,
    `import type { ${Array.from(new Set(dtoImports)).join(', ')} } from './dto';`,
    '',
    '// Project-ready API candidate. Review under openapi/project before apply.',
    `// Rules source: ${projectConfig.projectRulesPath ?? 'openapi/config/project-rules.jsonc'}`,
  ];

  const summaryDoc = buildJsDoc(operation.summary || operation.description).join('\n');
  if (summaryDoc) {
    sections.push(summaryDoc);
  }

  sections.push(
    `const ${functionName}Path = ${JSON.stringify(endpoint.path)};`,
    `const ${functionName}Method = ${JSON.stringify(method.toUpperCase())} as const;`,
  );

  if (hasPathParams) {
    sections.push(buildPathTemplateBuilder(prefix, `${functionName}Path`));
  }

  if (requestBodyKind === 'multipart' && multipartStrategy === 'form-data') {
    sections.push(buildMultipartRuntimeHelpersSource());
  }

  if (hasCookieParams) {
    sections.push(
      '// Swagger cookie parameter는 브라우저 환경에서 직접 직렬화하지 않습니다.',
      '// 필요한 경우 withCredentials 또는 별도 인증 로직에서 처리합니다.',
    );
  }

  const activeKinds = [hasPathParams, hasQueryParams, hasRequestBody, hasHeaderParams].filter(Boolean).length;

  if (activeKinds > 1) {
    const argsLines = [`export interface ${prefix}ApiArgs {`];
    if (hasPathParams) {
      argsLines.push(`  pathParams: ${prefix}PathParamsDto;`);
    }
    if (hasQueryParams) {
      argsLines.push(`  params: ${prefix}ParamsDto;`);
    }
    if (hasRequestBody) {
      argsLines.push(`  data${requestBodySchema && !resolveRequestBody(operation.requestBody)?.required ? '?' : ''}: ${prefix}RequestDto;`);
    }
    if (hasHeaderParams) {
      argsLines.push(`  headers${parameters.some((parameter) => parameter.in === 'header' && parameter.required) ? '' : '?'}: ${prefix}HeadersDto;`);
    }
    argsLines.push('}');
    sections.push(argsLines.join('\n'));
  }

  let signature = '';
  if (activeKinds === 0) {
    signature = `(config?: ${axiosConfigTypeName})`;
  } else if (activeKinds === 1) {
    if (hasQueryParams) {
      signature = `(params: ${prefix}ParamsDto, config?: ${axiosConfigTypeName})`;
    } else if (hasRequestBody) {
      signature = `(data${requestBodySchema && !resolveRequestBody(operation.requestBody)?.required ? '?' : ''}: ${prefix}RequestDto, config?: ${axiosConfigTypeName})`;
    } else if (hasPathParams) {
      signature = `(pathParams: ${prefix}PathParamsDto, config?: ${axiosConfigTypeName})`;
    } else {
      signature = `(headers: ${prefix}HeadersDto, config?: ${axiosConfigTypeName})`;
    }
  } else {
    signature = `(args: ${prefix}ApiArgs, config?: ${axiosConfigTypeName})`;
  }

  const endpointExpression = hasPathParams
    ? `build${prefix}Path(${activeKinds === 1 ? 'pathParams' : 'args.pathParams'})`
    : `${functionName}Path`;
  const configEntries = ['...(config ?? {})', `method: ${functionName}Method`];

  if (hasQueryParams) {
    configEntries.push(`params: ${activeKinds === 1 ? 'params' : 'args.params'}`);
  }

  if (hasRequestBody) {
    const dataExpression =
      requestBodyKind === 'multipart' && multipartStrategy === 'form-data'
        ? `buildMultipartFormData(${activeKinds === 1 ? 'data' : 'args.data'} as Record<string, unknown>)`
        : activeKinds === 1
          ? 'data'
          : 'args.data';
    const requiredBody = Boolean(resolveRequestBody(operation.requestBody)?.required);

    if (requiredBody) {
      configEntries.push(`data: ${dataExpression}`);
    } else {
      configEntries.push(
        `data: ${activeKinds === 1 ? 'data' : 'args.data'} ? ${dataExpression} : undefined`,
      );
    }
  }

  if (hasHeaderParams) {
    const headerExpression = activeKinds === 1 ? 'headers' : 'args.headers';
    configEntries.push(
      `headers: { ...(${headerExpression} ?? {}), ...(config?.headers ?? {}) }`,
    );
  }

  const functionLines = [
    `const ${functionName} = async ${signature}: Promise<${prefix}ResponseDto> => {`,
    `  return ${fetchApiSymbol}<${prefix}ResponseDto>(${endpointExpression}, {`,
    ...configEntries.map((entry) => `    ${entry},`),
    '  });',
    '};',
    '',
    `export { ${functionName} };`,
  ];

  sections.push(functionLines.join('\n'));

  return `${sections.filter(Boolean).join('\n\n')}\n`;
}

function renderProjectSummary(manifest) {
  const lines = [
    '# Project Candidate Summary',
    '',
    `- Generated at: ${manifest.generatedAt}`,
    `- Source OpenAPI: ${manifest.sourcePath}`,
    `- Project rules: ${manifest.projectRulesPath}`,
    `- Review source root: ${manifest.projectGeneratedSrcDir}`,
    `- Apply target root: ${manifest.applyTargetSrcDir}`,
    `- Total endpoints: ${manifest.totalEndpoints}`,
    '',
    '## Review Flow',
    '',
    '1. `./openapi/run.sh refresh`',
    '2. `./openapi/run.sh project`',
    '3. `openapi/project/src/openapi-generated` 확인',
    '4. 문제가 없으면 `./openapi/run.sh apply`',
    '',
    '## Generated Files',
    '',
  ];

  for (const item of manifest.files) {
    lines.push(
      `- \`${item.endpointId}\` [${item.method}] \`${item.path}\`${item.summary ? ` - ${item.summary}` : ''}`,
    );
    lines.push(`  - dto: \`${item.generated.dto}\``);
    lines.push(`  - api: \`${item.generated.api}\``);
    lines.push(`  - apply target: \`${item.target.api.replace(/\/api\.ts$/, '')}\``);
  }

  lines.push('');
  return lines.join('\n');
}

const projectCommand = {
  name: 'project',
  async run() {
    rootDir = process.cwd();
    ({ projectConfig } = await loadProjectConfig(rootDir));

    try {
      ({ projectRules } = await loadProjectRules(rootDir, projectConfig));
    } catch (error) {
      if (error?.code === 'ENOENT') {
        throw new Error(
          `Project rules not found.\nRun openapi-tool rules first.\nExpected: ${path.resolve(rootDir, projectConfig.projectRulesPath ?? 'openapi/config/project-rules.jsonc')}`,
        );
      }
      throw error;
    }

    sourcePath = path.resolve(rootDir, projectConfig.sourcePath);
    projectGeneratedSrcDir = path.resolve(rootDir, projectConfig.projectGeneratedSrcDir);
    projectRootDir = path.resolve(projectGeneratedSrcDir, '..', '..');
    projectEndpointsDir = path.join(projectGeneratedSrcDir, 'endpoints');
    projectManifestPath = path.join(projectRootDir, 'manifest.json');
    projectSummaryPath = path.join(projectRootDir, 'summary.md');
    apiRules = projectRules.api ?? {};
    typeRules = projectRules.types ?? {};
    generationRules = projectRules.generation ?? {};
    fetchApiImportPath = apiRules.fetchApiImportPath ?? '@/shared/api';
    fetchApiSymbol = apiRules.fetchApiSymbol ?? 'fetchAPI';
    axiosConfigImportPath = apiRules.axiosConfigImportPath ?? 'axios';
    axiosConfigTypeName = apiRules.axiosConfigTypeName ?? 'AxiosRequestConfig';
    commonTypesImportPath = typeRules.commonTypesImportPath ?? '@/shared/type/api';
    responseTypeName = typeRules.responseTypeName ?? 'Response';
    pagedResponseTypeName = typeRules.pagedResponseTypeName ?? 'PagedResponse';
    queryFlattenStrategy =
      generationRules.queryFlattenStrategy ?? 'form_explode_object';
    responseWrapperStrategy =
      generationRules.responseWrapperStrategy ?? 'jsend_to_response';
    multipartStrategy = generationRules.multipartStrategy ?? 'form-data';

    spec = await readJson(sourcePath);
    endpoints = buildEndpointCatalog(spec);

    if (endpoints.length === 0) {
      throw new Error(`No endpoints found in ${sourcePath}`);
    }

    await cleanDir(projectGeneratedSrcDir);

    const manifestFiles = [];

    for (const endpoint of endpoints) {
      const fileSlug = toKebabCase(endpoint.id ?? `${endpoint.method}-${endpoint.path}`);
      const endpointDir = path.join(projectEndpointsDir, fileSlug);
      const dtoFilePath = path.join(endpointDir, 'dto.ts');
      const apiFilePath = path.join(endpointDir, 'api.ts');
      const targetDtoPath = path.join(
        projectConfig.applyTargetSrcDir,
        'endpoints',
        fileSlug,
        'dto.ts',
      );
      const targetApiPath = path.join(
        projectConfig.applyTargetSrcDir,
        'endpoints',
        fileSlug,
        'api.ts',
      );

      await writeText(dtoFilePath, buildProjectDtoFile(endpoint));
      await writeText(apiFilePath, buildProjectApiFile(endpoint));

      manifestFiles.push({
        endpointId: endpoint.id,
        method: endpoint.method.toUpperCase(),
        path: endpoint.path,
        summary: endpoint.summary,
        generated: {
          dto: toPosixRelativePath(rootDir, dtoFilePath),
          api: toPosixRelativePath(rootDir, apiFilePath),
        },
        target: {
          dto: targetDtoPath.replaceAll(path.sep, '/'),
          api: targetApiPath.replaceAll(path.sep, '/'),
        },
      });
    }

    const manifest = {
      generatedAt: new Date().toISOString(),
      sourcePath: projectConfig.sourcePath,
      projectRulesPath: projectConfig.projectRulesPath ?? 'openapi/config/project-rules.jsonc',
      projectGeneratedSrcDir: projectConfig.projectGeneratedSrcDir,
      applyTargetSrcDir: projectConfig.applyTargetSrcDir,
      totalEndpoints: endpoints.length,
      files: manifestFiles,
    };

    await writeJson(projectManifestPath, manifest);
    await writeText(projectSummaryPath, renderProjectSummary(manifest));

    console.log(
      `Generated ${endpoints.length} project candidate endpoint(s) into ${projectGeneratedSrcDir}`,
    );
  },
};

export { projectCommand };
