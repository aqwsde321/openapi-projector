import {
  parseReferencedSchemaName,
} from '../path-utils/index.mjs';
import {
  getSchemaUsageLabel,
} from '../schema-usage/targets.mjs';

function classifyChangeDetail(detailPath, comparisonContext) {
  if (detailPath.startsWith('operation.parameters')) {
    return 'Parameter';
  }

  if (
    detailPath.startsWith('operation.requestBody') &&
    detailPath.endsWith('$ref')
  ) {
    return 'Request Body Schema';
  }

  if (
    detailPath.startsWith('operation.responses') &&
    detailPath.endsWith('$ref')
  ) {
    return 'Response Body Schema';
  }

  if (detailPath.startsWith('operation.requestBody')) {
    return 'Request Body';
  }

  if (detailPath.startsWith('operation.responses')) {
    return 'Response';
  }

  if (detailPath.startsWith('referencedSchemas')) {
    const schemaName = parseReferencedSchemaName(detailPath);
    return schemaName
      ? `${getSchemaUsageLabel(schemaName, comparisonContext)} Schema`
      : 'Schema';
  }

  if (
    ['summary', 'description', 'operationId', 'tags', 'documentation'].includes(
      detailPath,
    )
  ) {
    return 'Documentation';
  }

  return 'Contract';
}

function formatSchemaPropertyTarget({ schemaName, propertyName, fieldPath }) {
  return `${schemaName}.${propertyName}${fieldPath ? `.${fieldPath}` : ''}`;
}

export {
  classifyChangeDetail,
  formatSchemaPropertyTarget,
};
