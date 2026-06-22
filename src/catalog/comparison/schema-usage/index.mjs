import { toTitleCase } from '../../format/inline.mjs';
import {
  addContentSchemaUsage,
  addHeaderSchemaUsage,
  addRequestBodyEncodingHeaderSchemaUsage,
  addSchemaUsage,
} from './collectors.mjs';

function mergeSchemaUsageMaps(...usageMaps) {
  const merged = new Map();

  for (const usageMap of usageMaps) {
    for (const [schemaName, usages] of usageMap) {
      const mergedUsages = merged.get(schemaName) ?? new Set();
      usages.forEach((usage) => mergedUsages.add(usage));
      merged.set(schemaName, mergedUsages);
    }
  }

  return merged;
}

function buildSchemaUsageMap(snapshot) {
  const usageByName = new Map();
  const operation = snapshot?.operation;
  const referencedSchemas = snapshot?.referencedSchemas ?? {};

  if (!operation) {
    return usageByName;
  }

  addContentSchemaUsage(
    usageByName,
    'Request Body',
    operation.requestBody?.content,
    referencedSchemas,
  );
  addRequestBodyEncodingHeaderSchemaUsage(
    usageByName,
    operation.requestBody,
    referencedSchemas,
  );

  for (const response of Object.values(operation.responses ?? {})) {
    addContentSchemaUsage(
      usageByName,
      'Response Body',
      response?.content,
      referencedSchemas,
    );
    addHeaderSchemaUsage(
      usageByName,
      'Response Header',
      response?.headers,
      referencedSchemas,
    );
  }

  for (const parameter of operation.parameters ?? []) {
    const usage = `${toTitleCase(parameter?.in)} Parameter`;
    addSchemaUsage(usageByName, usage, parameter?.schema, referencedSchemas);
    addContentSchemaUsage(
      usageByName,
      usage,
      parameter?.content,
      referencedSchemas,
    );
  }

  return usageByName;
}

export {
  buildSchemaUsageMap,
  mergeSchemaUsageMaps,
};
