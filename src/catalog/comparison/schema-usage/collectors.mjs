import { collectReferencedSchemaClosure } from './ref-closure.mjs';

function addContentSchemaUsage(
  usageByName,
  usage,
  content = {},
  referencedSchemas = {},
) {
  for (const mediaType of Object.values(content ?? {})) {
    addSchemaUsage(usageByName, usage, mediaType?.schema, referencedSchemas);
  }
}

function addHeaderSchemaUsage(
  usageByName,
  usage,
  headers = {},
  referencedSchemas = {},
) {
  for (const header of Object.values(headers ?? {})) {
    addSchemaUsage(usageByName, usage, header?.schema, referencedSchemas);
    addContentSchemaUsage(
      usageByName,
      usage,
      header?.content,
      referencedSchemas,
    );
  }
}

function addRequestBodyEncodingHeaderSchemaUsage(
  usageByName,
  requestBody,
  referencedSchemas = {},
) {
  for (const mediaType of Object.values(requestBody?.content ?? {})) {
    for (const encoding of Object.values(mediaType?.encoding ?? {})) {
      addHeaderSchemaUsage(
        usageByName,
        'Request Header',
        encoding?.headers,
        referencedSchemas,
      );
    }
  }
}

function addSchemaUsage(usageByName, usage, value, referencedSchemas = {}) {
  for (const schemaName of collectReferencedSchemaClosure(
    value,
    referencedSchemas,
  )) {
    const usages = usageByName.get(schemaName) ?? new Set();
    usages.add(usage);
    usageByName.set(schemaName, usages);
  }
}

export {
  addContentSchemaUsage,
  addHeaderSchemaUsage,
  addRequestBodyEncodingHeaderSchemaUsage,
  addSchemaUsage,
};
