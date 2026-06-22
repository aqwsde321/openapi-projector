import {
  buildSchemaUsageLabels,
  compactSchemaUsageLabels,
} from './label-builder.mjs';

function getSchemaFieldCategory(schemaName, comparisonContext) {
  return `${getSchemaUsageLabel(schemaName, comparisonContext)} Field`;
}

function getSchemaUsageLabel(schemaName, comparisonContext) {
  const usages =
    comparisonContext?.schemaUsageByName?.get(schemaName) ?? new Set();
  const labels = buildSchemaUsageLabels(usages);

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length > 1) {
    return compactSchemaUsageLabels(labels).join(' + ');
  }

  if (usages.size === 1) {
    return [...usages][0];
  }

  return 'Schema';
}

function isResponseBodyOnlySchema(schemaName, comparisonContext = {}) {
  const usages =
    comparisonContext?.schemaUsageByName?.get(schemaName) ?? new Set();
  return usages.size === 1 && usages.has('Response Body');
}

export {
  getSchemaFieldCategory,
  getSchemaUsageLabel,
  isResponseBodyOnlySchema,
};
