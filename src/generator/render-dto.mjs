import {
  collectRefs,
  createTypeRenderer,
  escapeComment,
  getByRef,
  getRequestBodySchema,
  getResponseSchema,
  normalizeText,
  quotePropertyName,
  toPascalCase,
} from '../core/openapi-utils.mjs';

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
  const schemaTypes = Array.isArray(schema?.type) ? schema.type : [schema?.type];
  const isNullable = Boolean(schema?.nullable || schemaTypes.includes('null'));

  return Boolean(
    schema &&
      !isNullable &&
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

export {
  buildFieldEntriesFromParameters,
  buildFieldEntriesFromSchema,
  buildJsDoc,
  buildLocalSchemaContext,
  hasDuplicateFieldNames,
  isSimpleObjectSchema,
  renderConcreteNamedSchema,
  renderInlineRequestDtoSource,
  renderNestedRequestDtoSource,
  resolveSchema,
};
