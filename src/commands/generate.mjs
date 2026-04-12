import fs from 'node:fs/promises';
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
  normalizeText,
  quotePropertyName,
  readJson,
  toCamelCase,
  toKebabCase,
  toPascalCase,
  writeText,
} from '../core/openapi-utils.mjs';

let rootDir;
let projectConfig;
let sourcePath;
let docsDir;
let endpointsDir;
let legacySwaggerDir;
let legacyCompareDir;
let spec;
let endpoints;
let fallbackRenderer;

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
  if (parameter.style) {
    return {
      value: parameter.style,
      source: 'explicit',
    };
  }

  return {
    value: getDefaultStyle(parameter.in),
    source: 'default',
  };
}

function getParameterExplode(parameter, styleValue) {
  if (parameter.explode !== undefined) {
    return {
      value: Boolean(parameter.explode),
      source: 'explicit',
    };
  }

  return {
    value: styleValue === 'form',
    source: 'default',
  };
}

function isJsonMediaType(mediaType) {
  return (
    mediaType === 'application/json' ||
    mediaType === '*/*' ||
    Boolean(mediaType && mediaType.endsWith('+json'))
  );
}

function getRequestBodyKind(mediaType) {
  if (!mediaType) {
    return null;
  }

  if (mediaType === 'multipart/form-data') {
    return 'multipart';
  }

  if (isJsonMediaType(mediaType)) {
    return 'json';
  }

  return 'raw';
}

function buildSampleValue(schema, hint = 'value', stack = new Set(), depth = 0) {
  const [resolved, refName] = dereferenceSchema(schema);
  const normalizedHint = String(hint).toLowerCase();
  const currentSchema = resolved ?? schema;

  if (!currentSchema || depth >= 4) {
    return 'sample';
  }

  if (refName) {
    if (stack.has(refName)) {
      return 'sample';
    }
    stack.add(refName);
  }

  if (currentSchema.enum?.length) {
    return currentSchema.enum[0];
  }

  if (currentSchema.oneOf?.length) {
    return buildSampleValue(currentSchema.oneOf[0], hint, stack, depth + 1);
  }

  if (currentSchema.anyOf?.length) {
    return buildSampleValue(currentSchema.anyOf[0], hint, stack, depth + 1);
  }

  if (currentSchema.allOf?.length) {
    const mergedObject = {};
    for (const item of currentSchema.allOf) {
      const childValue = buildSampleValue(item, hint, stack, depth + 1);
      if (childValue && typeof childValue === 'object' && !Array.isArray(childValue)) {
        Object.assign(mergedObject, childValue);
      }
    }
    if (Object.keys(mergedObject).length > 0) {
      return mergedObject;
    }
  }

  switch (currentSchema.type) {
    case 'boolean':
      return true;
    case 'integer':
    case 'number':
      if (normalizedHint.includes('size')) {
        return 20;
      }
      return 1;
    case 'array':
      return [buildSampleValue(currentSchema.items ?? {}, hint, stack, depth + 1)];
    case 'object':
    default:
      if (currentSchema.properties) {
        const objectValue = {};
        for (const [propName, propSchema] of Object.entries(currentSchema.properties)) {
          objectValue[propName] = buildSampleValue(propSchema, propName, stack, depth + 1);
        }
        return objectValue;
      }

      if (currentSchema.format === 'date-time') {
        return '2026-01-01T09:00:00Z';
      }

      if (currentSchema.format === 'date') {
        return '2026-01-01';
      }

      if (normalizedHint.includes('email')) {
        return 'sample@example.com';
      }

      if (normalizedHint.includes('biz')) {
        return '1234567890';
      }

      if (normalizedHint.includes('company')) {
        return 'sample-company';
      }

      if (normalizedHint.includes('title')) {
        return 'sample-title';
      }

      if (normalizedHint.includes('content')) {
        return '<p>sample-content</p>';
      }

      if (normalizedHint.includes('name')) {
        return 'sample-name';
      }

      if (normalizedHint.includes('phone') || normalizedHint.includes('call')) {
        return '01012345678';
      }

      if (normalizedHint.includes('sort')) {
        return 'createdAt,DESC';
      }

      if (normalizedHint.includes('visible')) {
        return true;
      }

      if (currentSchema.type === 'string') {
        return 'sample';
      }

      return 'sample';
  }
}

function appendQueryEntries(entries, key, value) {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      appendQueryEntries(entries, key, item);
    }
    return;
  }

  entries.push([key, String(value)]);
}

function appendDeepObjectEntries(entries, prefix, value) {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      appendQueryEntries(entries, prefix, item);
    }
    return;
  }

  if (typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) {
      appendDeepObjectEntries(entries, `${prefix}[${childKey}]`, childValue);
    }
    return;
  }

  entries.push([prefix, String(value)]);
}

function serializeQueryParameterEntries(name, value, style, explode) {
  const entries = [];

  if (value === undefined || value === null) {
    return entries;
  }

  if (Array.isArray(value)) {
    if (style === 'spaceDelimited') {
      entries.push([name, value.map((item) => String(item)).join(' ')]);
      return entries;
    }

    if (style === 'pipeDelimited') {
      entries.push([name, value.map((item) => String(item)).join('|')]);
      return entries;
    }

    if (explode) {
      for (const item of value) {
        appendQueryEntries(entries, name, item);
      }
      return entries;
    }

    entries.push([name, value.map((item) => String(item)).join(',')]);
    return entries;
  }

  if (typeof value === 'object') {
    const objectEntries = Object.entries(value).filter(
      ([, childValue]) => childValue !== undefined && childValue !== null,
    );

    if (style === 'deepObject') {
      appendDeepObjectEntries(entries, name, value);
      return entries;
    }

    if (style === 'form' && explode) {
      for (const [childKey, childValue] of objectEntries) {
        appendQueryEntries(entries, childKey, childValue);
      }
      return entries;
    }

    const flattened = [];
    for (const [childKey, childValue] of objectEntries) {
      if (Array.isArray(childValue)) {
        for (const item of childValue) {
          flattened.push(childKey, String(item));
        }
        continue;
      }

      flattened.push(childKey, String(childValue));
    }
    entries.push([name, flattened.join(',')]);
    return entries;
  }

  appendQueryEntries(entries, name, value);
  return entries;
}

function buildQuerySerializationInfo(parameters, renderer) {
  const queryParameters = parameters.filter((parameter) => parameter.in === 'query');

  if (queryParameters.length === 0) {
    return {
      items: [],
      combinedExample: '',
    };
  }

  const combinedEntries = [];
  const items = queryParameters.map((parameter) => {
    const style = getParameterStyle(parameter);
    const explode = getParameterExplode(parameter, style.value);
    const sampleValue = buildSampleValue(parameter.schema, parameter.name);
    const serializedEntries = serializeQueryParameterEntries(
      parameter.name,
      sampleValue,
      style.value,
      explode.value,
    );

    combinedEntries.push(...serializedEntries);

    return {
      name: parameter.name,
      required: Boolean(parameter.required),
      style,
      explode,
      generatedType: renderer.renderType(parameter.schema).replace(/\s+/g, ' ').trim(),
      example: new URLSearchParams(serializedEntries).toString(),
    };
  });

  return {
    items,
    combinedExample: new URLSearchParams(combinedEntries).toString(),
  };
}

function buildOperationDtoFile(endpoint) {
  const method = endpoint.method.toLowerCase();
  const pathItem = spec.paths?.[endpoint.path];
  const operation = pathItem?.[method];

  if (!pathItem || !operation) {
    throw new Error(`Endpoint missing in OpenAPI spec: ${method.toUpperCase()} ${endpoint.path}`);
  }

  const context = buildLocalSchemaContext(endpoint, pathItem, operation);
  const parameters = getOperationParameters(spec, pathItem, operation);
  const requestSchema = getRequestBodySchema(spec, operation.requestBody);
  const [primaryStatus] = findPrimaryResponse(operation.responses);
  const sections = [];

  if (context.localSchemaNames.length > 0) {
    sections.push('// Local schemas referenced by this endpoint');
    sections.push(
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
  const jsDocBlock = buildJsDoc(operation.summary || operation.description).join('\n');
  if (jsDocBlock) {
    operationSections.push(jsDocBlock);
  }

  for (const location of ['path', 'query', 'header', 'cookie']) {
    const block = buildParameterObject(
      parameters,
      location,
      `${context.prefix}${toPascalCase(location)}Params`,
      context.renderer,
    );

    if (block) {
      operationSections.push(block);
    }
  }

  if (requestSchema) {
    operationSections.push(
      `export type ${context.prefix}RequestBody = ${context.renderer.renderType(requestSchema)};`,
    );
  }

  for (const [statusCode, response] of Object.entries(operation.responses ?? {})) {
    const responseSchema = getResponseSchema(spec, response);
    const statusTypeName = `${context.prefix}Response${String(statusCode).replace(/[^a-zA-Z0-9]+/g, '')}`;
    operationSections.push(
      `export type ${statusTypeName} = ${
        responseSchema ? context.renderer.renderType(responseSchema) : 'void'
      };`,
    );
  }

  operationSections.push(
    `export type ${context.prefix}Response = ${
      primaryStatus
        ? `${context.prefix}Response${String(primaryStatus).replace(/[^a-zA-Z0-9]+/g, '')}`
        : 'unknown'
    };`,
  );

  if (operationSections.length > 0) {
    sections.push('// Endpoint request / response DTO');
    sections.push(...operationSections);
  }

  return `${sections.filter(Boolean).join('\n\n')}\n`;
}

function buildRequestShape(parameters, requestBody, prefix) {
  const groups = [
    {
      source: 'path',
      property: 'pathParams',
      typeName: `${prefix}PathParams`,
    },
    {
      source: 'query',
      property: 'query',
      typeName: `${prefix}QueryParams`,
    },
    {
      source: 'header',
      property: 'headers',
      typeName: `${prefix}HeaderParams`,
    },
    {
      source: 'cookie',
      property: 'cookies',
      typeName: `${prefix}CookieParams`,
    },
  ];

  const fields = groups
    .map((group) => {
      const matched = parameters.filter((parameter) => parameter.in === group.source);
      if (matched.length === 0) {
        return null;
      }

      return {
        property: group.property,
        typeName: group.typeName,
        required: matched.some((parameter) => parameter.required),
      };
    })
    .filter(Boolean);

  const resolvedRequestBody = resolveRequestBody(requestBody);
  const requestBodySchema = getRequestBodySchema(spec, requestBody);
  if (requestBodySchema) {
    fields.push({
      property: 'body',
      typeName: `${prefix}RequestBody`,
      required: Boolean(resolvedRequestBody?.required),
    });
  }

  return fields;
}

function buildQueryRuntimeHelpersSource() {
  return [
    'function appendQueryEntry(params: URLSearchParams, key: string, value: unknown): void {',
    '  if (value === undefined || value === null) {',
    '    return;',
    '  }',
    '',
    '  if (Array.isArray(value)) {',
    '    for (const item of value) {',
    '      appendQueryEntry(params, key, item);',
    '    }',
    '    return;',
    '  }',
    '',
    '  params.append(key, String(value));',
    '}',
    '',
    'function appendDeepObjectEntries(params: URLSearchParams, prefix: string, value: unknown): void {',
    '  if (value === undefined || value === null) {',
    '    return;',
    '  }',
    '',
    '  if (Array.isArray(value)) {',
    '    for (const item of value) {',
    '      appendQueryEntry(params, prefix, item);',
    '    }',
    '    return;',
    '  }',
    '',
    '  if (typeof value === \'object\') {',
    '    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {',
    '      appendDeepObjectEntries(params, `${prefix}[${childKey}]`, childValue);',
    '    }',
    '    return;',
    '  }',
    '',
    '  params.append(prefix, String(value));',
    '}',
    '',
    'function serializeQueryParameter(',
    '  params: URLSearchParams,',
    '  name: string,',
    '  value: unknown,',
    '  options: { style: string; explode: boolean },',
    '): void {',
    '  if (value === undefined || value === null) {',
    '    return;',
    '  }',
    '',
    '  const { style, explode } = options;',
    '',
    '  if (Array.isArray(value)) {',
    '    if (style === \'spaceDelimited\') {',
    '      params.append(name, value.map((item) => String(item)).join(\' \'));',
    '      return;',
    '    }',
    '',
    '    if (style === \'pipeDelimited\') {',
    '      params.append(name, value.map((item) => String(item)).join(\'|\'));',
    '      return;',
    '    }',
    '',
    '    if (explode) {',
    '      for (const item of value) {',
    '        appendQueryEntry(params, name, item);',
    '      }',
    '      return;',
    '    }',
    '',
    '    params.append(name, value.map((item) => String(item)).join(\',\'));',
    '    return;',
    '  }',
    '',
    '  if (typeof value === \'object\') {',
    '    const objectEntries = Object.entries(value as Record<string, unknown>).filter(',
    '      ([, childValue]) => childValue !== undefined && childValue !== null,',
    '    );',
    '',
    '    if (style === \'deepObject\') {',
    '      appendDeepObjectEntries(params, name, value);',
    '      return;',
    '    }',
    '',
    '    if (style === \'form\' && explode) {',
    '      for (const [childKey, childValue] of objectEntries) {',
    '        appendQueryEntry(params, childKey, childValue);',
    '      }',
    '      return;',
    '    }',
    '',
    '    const flattened: string[] = [];',
    '    for (const [childKey, childValue] of objectEntries) {',
    '      if (Array.isArray(childValue)) {',
    '        for (const item of childValue) {',
    '          flattened.push(childKey, String(item));',
    '        }',
    '        continue;',
    '      }',
    '',
    '      flattened.push(childKey, String(childValue));',
    '    }',
    '',
    '    params.append(name, flattened.join(\',\'));',
    '    return;',
    '  }',
    '',
    '  appendQueryEntry(params, name, value);',
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

function buildPathRuntimeHelpersSource() {
  return [
    'function applyPathParams(',
    '  pathTemplate: string,',
    '  pathParams: Record<string, string | number | boolean>,',
    '): string {',
    '  return pathTemplate.replace(/\\{([^}]+)\\}/g, (_, key: string) => {',
    '    const rawValue = pathParams[key];',
    '    if (rawValue === undefined || rawValue === null) {',
    '      throw new Error(`Missing path param: ${key}`);',
    '    }',
    '',
    '    return encodeURIComponent(String(rawValue));',
    '  });',
    '}',
  ].join('\n');
}

function buildOperationApiFile(endpoint) {
  const method = endpoint.method.toLowerCase();
  const pathItem = spec.paths?.[endpoint.path];
  const operation = pathItem?.[method];

  if (!pathItem || !operation) {
    throw new Error(`Endpoint missing in OpenAPI spec: ${method.toUpperCase()} ${endpoint.path}`);
  }

  const context = buildLocalSchemaContext(endpoint, pathItem, operation);
  const apiConstName = `${toCamelCase(endpoint.id ?? `${method}-${endpoint.path}`)}Api`;
  const callFunctionName = `call${context.prefix}`;
  const buildHttpRequestName = `build${context.prefix}HttpRequest`;
  const serializeQueryName = `serialize${context.prefix}Query`;
  const requesterTypeName = `${context.prefix}Requester`;
  const httpRequestTypeName = `${context.prefix}HttpRequest`;
  const parameters = getOperationParameters(spec, pathItem, operation);
  const requestFields = buildRequestShape(parameters, operation.requestBody, context.prefix);
  const [primaryStatus] = findPrimaryResponse(operation.responses);
  const querySerialization = buildQuerySerializationInfo(parameters, context.renderer);
  const requestBodyMediaType = getRequestBodyMediaType(spec, operation.requestBody);
  const requestBodyKind = getRequestBodyKind(requestBodyMediaType);
  const hasQuery = requestFields.some((field) => field.property === 'query');
  const hasPathParams = requestFields.some((field) => field.property === 'pathParams');
  const requestFieldMap = new Map(requestFields.map((field) => [field.property, field]));
  const bodyField = requestFieldMap.get('body') ?? null;
  const httpBodyType =
    bodyField && requestBodyKind === 'multipart' ? 'FormData' : bodyField?.typeName ?? null;
  const dtoTypeNames = [
    `${context.prefix}Response`,
    ...requestFields.map((field) => field.typeName),
  ];
  const uniqueDtoTypeNames = Array.from(new Set(dtoTypeNames));
  const sections = [
    `import type { ${uniqueDtoTypeNames.join(', ')} } from './dto';`,
    `export type { ${uniqueDtoTypeNames.join(', ')} } from './dto';`,
  ];

  const jsDocBlock = buildJsDoc(operation.summary || operation.description).join('\n');
  if (jsDocBlock) {
    sections.push(jsDocBlock);
  }

  const metaFields = [
    `  id: ${JSON.stringify(endpoint.id)}`,
    `  method: ${JSON.stringify(method.toUpperCase())}`,
    `  path: ${JSON.stringify(endpoint.path)}`,
  ];

  if (operation.summary) {
    metaFields.push(`  summary: ${JSON.stringify(normalizeText(operation.summary))}`);
  }

  if (operation.operationId) {
    metaFields.push(`  operationId: ${JSON.stringify(operation.operationId)}`);
  }

  if (Array.isArray(operation.tags) && operation.tags.length > 0) {
    metaFields.push(`  tags: ${JSON.stringify(operation.tags)}`);
  }

  if (primaryStatus) {
    metaFields.push(`  primaryResponseStatus: ${JSON.stringify(String(primaryStatus))}`);
  }

  if (requestBodyMediaType) {
    metaFields.push(`  requestMediaType: ${JSON.stringify(requestBodyMediaType)}`);
  }

  if (requestBodyKind) {
    metaFields.push(`  requestBodyKind: ${JSON.stringify(requestBodyKind)}`);
  }

  sections.push(
    '/**\n * 이 엔드포인트의 메타 정보입니다.\n */',
    `export const ${apiConstName} = {\n${metaFields.join(',\n')}\n} as const;`,
  );

  if (requestFields.length > 0) {
    const requestLines = [
      ...buildJsDoc('generated helper에 넘기는 입력 형태입니다.'),
      `export interface ${context.prefix}Request {`,
    ];

    for (const field of requestFields) {
      requestLines.push(
        `  ${field.property}${field.required ? '' : '?'}: ${field.typeName};`,
      );
    }

    requestLines.push('}');
    sections.push(requestLines.join('\n'));
  } else {
    sections.push(`export type ${context.prefix}Request = Record<string, never>;`);
  }

  const httpRequestLines = [
    ...buildJsDoc('requester adapter가 실제로 받아서 전송할 HTTP 요청 형태입니다.'),
    `export interface ${httpRequestTypeName} {`,
  ];
  httpRequestLines.push(`  path: string;`);
  httpRequestLines.push(`  method: typeof ${apiConstName}.method;`);

  if (hasQuery) {
    const queryField = requestFieldMap.get('query');
    httpRequestLines.push(`  queryString${queryField?.required ? '' : '?'}: string;`);
  }

  if (bodyField && httpBodyType) {
    httpRequestLines.push(`  body${bodyField.required ? '' : '?'}: ${httpBodyType};`);
    httpRequestLines.push(
      `  bodyKind${bodyField.required ? '' : '?'}: ${JSON.stringify(requestBodyKind ?? 'raw')};`,
    );
    if (requestBodyMediaType) {
      httpRequestLines.push(
        `  mediaType${bodyField.required ? '' : '?'}: ${JSON.stringify(requestBodyMediaType)};`,
      );
      if (requestBodyKind !== 'multipart') {
        httpRequestLines.push(
          `  contentType${bodyField.required ? '' : '?'}: ${JSON.stringify(requestBodyMediaType)};`,
        );
      }
    }
  }

  for (const field of requestFields.filter((item) => !['pathParams', 'query', 'body'].includes(item.property))) {
    httpRequestLines.push(
      `  ${field.property}${field.required ? '' : '?'}: ${field.typeName};`,
    );
  }

  httpRequestLines.push('}');
  sections.push(httpRequestLines.join('\n'));

  if (hasQuery) {
    const queryMetaConstName = `${apiConstName}QuerySerialization`;
    const queryMetaLines = [
      ...buildJsDoc('query parameter 직렬화 규칙입니다.'),
      `export const ${queryMetaConstName} = [`,
      ...querySerialization.items.map((item) =>
        `  {\n    name: ${JSON.stringify(item.name)},\n    style: ${JSON.stringify(item.style.value)},\n    explode: ${item.explode.value},\n    styleSource: ${JSON.stringify(item.style.source)},\n    explodeSource: ${JSON.stringify(item.explode.source)},\n    required: ${item.required},\n    generatedType: ${JSON.stringify(item.generatedType)},\n    example: ${JSON.stringify(item.example)},\n  },`,
      ),
      '] as const;',
      '',
      buildQueryRuntimeHelpersSource(),
      '',
      ...buildJsDoc('query 객체를 실제 query string으로 직렬화합니다.'),
      `export function ${serializeQueryName}(query: ${context.prefix}QueryParams): string {`,
      '  const params = new URLSearchParams();',
      ...parameters
        .filter((parameter) => parameter.in === 'query')
        .flatMap((parameter) => {
          const style = getParameterStyle(parameter);
          const explode = getParameterExplode(parameter, style.value);
          return [
            `  serializeQueryParameter(params, ${JSON.stringify(parameter.name)}, query.${quotePropertyName(parameter.name)}, {`,
            `    style: ${JSON.stringify(style.value)},`,
            `    explode: ${explode.value},`,
            '  });',
          ];
        }),
      '  return params.toString();',
      '}',
    ];
    sections.push(queryMetaLines.join('\n'));
  }

  if (hasPathParams) {
    sections.push(buildPathRuntimeHelpersSource());
  }

  if (requestBodyKind === 'multipart') {
    sections.push(buildMultipartRuntimeHelpersSource());
  }

  const buildRequestLines = [
    ...buildJsDoc('generated request 입력을 실제 HTTP 요청 형태로 변환합니다.'),
    `export function ${buildHttpRequestName}(request: ${context.prefix}Request): ${httpRequestTypeName} {`,
    '  return {',
    `    path: ${
      hasPathParams
        ? `applyPathParams(${apiConstName}.path, request.pathParams as Record<string, string | number | boolean>)`
        : `${apiConstName}.path`
    },`,
    `    method: ${apiConstName}.method,`,
  ];

  if (hasQuery) {
    const queryField = requestFieldMap.get('query');
    buildRequestLines.push(
      `    queryString: ${
        queryField?.required
          ? `${serializeQueryName}(request.query)`
          : `request.query ? ${serializeQueryName}(request.query) : undefined`
      },`,
    );
  }

  if (bodyField) {
    if (requestBodyKind === 'multipart') {
      buildRequestLines.push(
        `    body: ${
          bodyField.required
            ? `buildMultipartFormData(request.body as Record<string, unknown>)`
            : `request.body ? buildMultipartFormData(request.body as Record<string, unknown>) : undefined`
        },`,
      );
    } else {
      buildRequestLines.push(
        `    body: ${bodyField.required ? 'request.body' : 'request.body ?? undefined'},`,
      );
    }

    buildRequestLines.push(
      `    bodyKind: ${
        bodyField.required
          ? JSON.stringify(requestBodyKind ?? 'raw')
          : `request.body ? ${JSON.stringify(requestBodyKind ?? 'raw')} : undefined`
      },`,
    );

    if (requestBodyMediaType) {
      buildRequestLines.push(
        `    mediaType: ${
          bodyField.required
            ? JSON.stringify(requestBodyMediaType)
            : `request.body ? ${JSON.stringify(requestBodyMediaType)} : undefined`
        },`,
      );

      if (requestBodyKind !== 'multipart') {
        buildRequestLines.push(
          `    contentType: ${
            bodyField.required
              ? JSON.stringify(requestBodyMediaType)
              : `request.body ? ${JSON.stringify(requestBodyMediaType)} : undefined`
          },`,
        );
      }
    }
  }

  for (const field of requestFields.filter((item) => !['pathParams', 'query', 'body'].includes(item.property))) {
    buildRequestLines.push(
      `    ${field.property}: ${field.required ? `request.${field.property}` : `request.${field.property} ?? undefined`},`,
    );
  }

  buildRequestLines.push('  };', '}');
  sections.push(buildRequestLines.join('\n'));

  sections.push(
    '/**\n * 프로젝트 HTTP client adapter가 따라야 하는 최소 시그니처입니다.\n */',
    `export type ${requesterTypeName} = (request: ${httpRequestTypeName}) => Promise<${context.prefix}Response>;`,
  );
  sections.push(
    '/**\n * requester를 주입받아 이 엔드포인트를 호출하는 thin wrapper입니다.\n */',
    `export function ${callFunctionName}(requester: ${requesterTypeName}, request: ${context.prefix}Request): Promise<${context.prefix}Response> {\n  return requester(${buildHttpRequestName}(request));\n}`,
  );

  return `${sections.join('\n\n')}\n`;
}

function renderSchemaTree(schema, renderer, schemaNameMap, indent = 0, stack = new Set()) {
  const spacing = ' '.repeat(indent);

  if (!schema) {
    return [`${spacing}- unknown`];
  }

  if (schema.$ref) {
    const refName = schema.$ref.split('/').at(-1);
    const localName = schemaNameMap.get(refName) ?? refName;
    const resolved = spec.components?.schemas?.[refName];
    const line = `${spacing}- ${localName}`;
    if (!resolved || stack.has(localName)) {
      return [line];
    }

    const nextStack = new Set(stack);
    nextStack.add(localName);
    return [line, ...renderSchemaTree(resolved, renderer, schemaNameMap, indent + 2, nextStack)];
  }

  if (schema.oneOf || schema.anyOf || schema.allOf) {
    const key = schema.oneOf ? 'oneOf' : schema.anyOf ? 'anyOf' : 'allOf';
    const variants = schema[key] ?? [];
    const lines = [`${spacing}- ${key}`];
    variants.forEach((item, index) => {
      lines.push(`${spacing}  - option ${index + 1}`);
      lines.push(...renderSchemaTree(item, renderer, schemaNameMap, indent + 4, stack));
    });
    return lines;
  }

  if (schema.type === 'array') {
    return [`${spacing}- array`, ...renderSchemaTree(schema.items, renderer, schemaNameMap, indent + 2, stack)];
  }

  if (schema.type === 'object' || schema.properties) {
    const properties = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    const lines = [`${spacing}- object`];

    for (const [propName, propSchema] of Object.entries(properties)) {
      const detail = renderer.renderType(propSchema).replace(/\n/g, ' ');
      const description = normalizeText(propSchema.description);
      let line = `${spacing}  - ${propName}${required.has(propName) ? ' [required]' : ''}: ${detail}`;
      if (description) {
        line += ` - ${description.replace(/\n/g, ' ')}`;
      }
      lines.push(line);

      if (
        propSchema.$ref ||
        propSchema.properties ||
        propSchema.items ||
        propSchema.oneOf ||
        propSchema.anyOf ||
        propSchema.allOf
      ) {
        lines.push(...renderSchemaTree(propSchema, renderer, schemaNameMap, indent + 4, stack));
      }
    }

    if (schema.additionalProperties) {
      lines.push(`${spacing}  - additionalProperties: ${renderer.renderType(schema.additionalProperties)}`);
    }

    return lines;
  }

  const detail = renderer.renderType(schema).replace(/\n/g, ' ');
  const enumSuffix = schema.enum ? ` enum=${schema.enum.join(' | ')}` : '';
  return [`${spacing}- ${detail}${enumSuffix}`];
}

function buildUsageExample(endpoint) {
  const prefix = toPascalCase(endpoint.id ?? `${endpoint.method}-${endpoint.path}`);
  const fileSlug = toKebabCase(endpoint.id ?? `${endpoint.method}-${endpoint.path}`);
  const apiFilePath = path.join(endpointsDir, fileSlug, 'api.ts');
  const apiImportPath = toPosixRelativePath(docsDir, apiFilePath).replace(/\.ts$/, '');
  const callFunctionName = `call${prefix}`;
  const requesterTypeName = `${prefix}Requester`;

  return [
    `import { ${callFunctionName} } from '${apiImportPath}';`,
    `import type { ${prefix}Request, ${prefix}Requester, ${prefix}Response } from '${apiImportPath}';`,
    '',
    `const requester: ${requesterTypeName} = async (request) => {`,
    '  // request.bodyKind / request.mediaType 를 보고 HTTP client adapter 가 전송 방식을 결정합니다.',
    '  return httpClient(request);',
    '};',
    '',
    `const requestInput = {} as ${prefix}Request;`,
    `const response: ${prefix}Response = await ${callFunctionName}(requester, requestInput);`,
    '',
    'console.log(response);',
  ].join('\n');
}

function buildEndpointDoc(endpoint) {
  const method = endpoint.method.toLowerCase();
  const pathItem = spec.paths?.[endpoint.path];
  const operation = pathItem?.[method];

  if (!pathItem || !operation) {
    throw new Error(`Endpoint missing in OpenAPI spec: ${method.toUpperCase()} ${endpoint.path}`);
  }

  const fileSlug = toKebabCase(endpoint.id ?? `${endpoint.method}-${endpoint.path}`);
  const parameters = getOperationParameters(spec, pathItem, operation);
  const requestSchema = getRequestBodySchema(spec, operation.requestBody);
  const requestBodyMediaType = getRequestBodyMediaType(spec, operation.requestBody);
  const requestBodyKind = getRequestBodyKind(requestBodyMediaType);
  const [primaryStatus, primaryResponse] = findPrimaryResponse(operation.responses);
  const primaryResponseSchema = getResponseSchema(spec, primaryResponse);
  const dtoFilePath = toPosixRelativePath(docsDir, path.join(endpointsDir, fileSlug, 'dto.ts'));
  const apiFilePath = toPosixRelativePath(docsDir, path.join(endpointsDir, fileSlug, 'api.ts'));
  const context = buildLocalSchemaContext(endpoint, pathItem, operation);
  const querySerialization = buildQuerySerializationInfo(parameters, context.renderer);
  const docLines = [
    `# ${method.toUpperCase()} ${endpoint.path}`,
    '',
  ];

  if (operation.summary) {
    docLines.push(`- Summary: ${normalizeText(operation.summary)}`);
  }

  if (operation.operationId) {
    docLines.push(`- OperationId: ${operation.operationId}`);
  }

  if (operation.tags?.length) {
    docLines.push(`- Tags: ${operation.tags.join(', ')}`);
  }

  if (primaryStatus) {
    docLines.push(`- Primary response: ${primaryStatus}`);
  }

  if (requestBodyMediaType) {
    docLines.push(`- Request media type: ${requestBodyMediaType}`);
  }

  if (requestBodyKind) {
    docLines.push(`- Request body kind: ${requestBodyKind}`);
  }

  docLines.push(`- Generated DTO: ${dtoFilePath}`);
  docLines.push(`- Generated API: ${apiFilePath}`);

  if (operation.description) {
    docLines.push('', '## Description', '', normalizeText(operation.description));
  }

  docLines.push(
    '',
    '## Usage',
    '',
    '`requester`는 프로젝트의 HTTP client adapter 입니다. generated helper는 path/query/body 조립을 담당하고, multipart 요청은 `FormData`로 변환합니다.',
    '',
    '```ts',
    buildUsageExample(endpoint),
    '```',
  );

  if (parameters.length > 0) {
    docLines.push('', '## Parameters', '');
    for (const parameter of parameters) {
      const detail = context.renderer.renderType(parameter.schema).replace(/\n/g, ' ');
      const description = normalizeText(parameter.description);
      let line = `- ${parameter.name} [${parameter.in}]`;
      if (parameter.required) {
        line += ' [required]';
      }
      line += `: ${detail}`;
      if (parameter.in === 'query') {
        const style = getParameterStyle(parameter);
        const explode = getParameterExplode(parameter, style.value);
        line += ` - serialization: ${style.value}, explode=${explode.value}`;
        if (style.source === 'default' || explode.source === 'default') {
          line += ' (OpenAPI default)';
        }
      }
      if (description) {
        line += ` - ${description.replace(/\n/g, ' ')}`;
      }
      docLines.push(line);
    }
  }

  if (querySerialization.items.length > 0) {
    docLines.push('', '## Query Serialization', '');
    docLines.push('스펙에 `style`/`explode`가 없으면 OpenAPI 기본값을 사용합니다.', '');
    for (const item of querySerialization.items) {
      docLines.push(
        `- ${item.name}: type=${item.generatedType}, style=${item.style.value}, explode=${item.explode.value}${
          item.style.source === 'default' || item.explode.source === 'default'
            ? ' (default)'
            : ''
        }`,
      );
      if (item.example) {
        docLines.push(`  - example: \`${item.example}\``);
      }
    }
    if (querySerialization.combinedExample) {
      docLines.push('', `Combined example: \`${querySerialization.combinedExample}\``);
    }
  }

  if (requestSchema) {
    docLines.push('', '## Request DTO', '');
    docLines.push(
      ...renderSchemaTree(
        requestSchema,
        context.renderer,
        context.schemaNameMap,
      ),
    );
  }

  if (primaryResponseSchema) {
    docLines.push('', '## Response DTO', '');
    docLines.push(
      ...renderSchemaTree(
        primaryResponseSchema,
        context.renderer,
        context.schemaNameMap,
      ),
    );
  }

  if (Object.keys(operation.responses ?? {}).length > 0) {
    docLines.push('', '## Response Statuses', '');

    for (const [statusCode, response] of Object.entries(operation.responses)) {
      const description = normalizeText(response.$ref ? '' : response.description);
      docLines.push(
        `- ${statusCode}${description ? `: ${description.replace(/\n/g, ' ')}` : ''}`,
      );
    }
  }

  docLines.push('');
  return docLines.join('\n');
}

const generateCommand = {
  name: 'generate',
  async run() {
    rootDir = process.cwd();
    ({ projectConfig } = await loadProjectConfig(rootDir));

    sourcePath = path.resolve(rootDir, projectConfig.sourcePath);
    docsDir = path.resolve(rootDir, projectConfig.docsDir);
    endpointsDir = path.resolve(rootDir, projectConfig.endpointsDir);
    legacySwaggerDir = path.resolve(rootDir, 'openapi/generated/swagger');
    legacyCompareDir = path.resolve(rootDir, 'openapi/compare');

    spec = await readJson(sourcePath);
    endpoints = buildEndpointCatalog(spec);

    if (endpoints.length === 0) {
      throw new Error(`No endpoints found in ${sourcePath}`);
    }

    await cleanDir(docsDir);
    await cleanDir(endpointsDir);
    if (legacySwaggerDir !== endpointsDir) {
      await fs.rm(legacySwaggerDir, { recursive: true, force: true });
    }
    await fs.rm(legacyCompareDir, { recursive: true, force: true });

    fallbackRenderer = createTypeRenderer((name) => name);

    for (const endpoint of endpoints) {
      const fileSlug = toKebabCase(endpoint.id ?? `${endpoint.method}-${endpoint.path}`);
      const endpointDir = path.join(endpointsDir, fileSlug);
      const dtoFilePath = path.join(endpointDir, 'dto.ts');
      const apiFilePath = path.join(endpointDir, 'api.ts');
      const docFilePath = path.join(docsDir, `${fileSlug}.md`);

      await writeText(dtoFilePath, buildOperationDtoFile(endpoint));
      await writeText(apiFilePath, buildOperationApiFile(endpoint));
      await writeText(docFilePath, buildEndpointDoc(endpoint));
    }

    console.log(
      `Generated ${endpoints.length} endpoint doc(s) into ${docsDir} and endpoint artifacts into ${endpointsDir}`,
    );
  },
};

export { generateCommand };
