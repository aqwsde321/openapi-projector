import {
  parseReferencedSchemaName,
  parseReferencedSchemaTarget,
  parseSchemaRequiredDetailPath,
} from '../path-utils/index.mjs';
import { isResponseBodyOnlySchema } from '../schema-usage/targets.mjs';
import {
  getAddedOrRemovedDetailValue,
  isAddedOrRemovedDetail,
} from './object-row-values.mjs';

function shouldSuppressContractDetail(detail, comparisonContext) {
  const requiredTarget = parseSchemaRequiredDetailPath(detail.path);
  return Boolean(
    requiredTarget &&
      isResponseBodyOnlySchema(requiredTarget.schemaName, comparisonContext),
  );
}

function isSchemaRootObjectTypeChange(detail) {
  if (!isAddedOrRemovedDetail(detail)) {
    return false;
  }

  const schemaTarget = parseReferencedSchemaTarget(detail.path);
  const value = getAddedOrRemovedDetailValue(detail);
  return Boolean(
    schemaTarget?.schemaName &&
      !schemaTarget.propertyName &&
      schemaTarget.fieldPath === 'type' &&
      value === 'object',
  );
}

function shouldSuppressRenamedSchemaDetail(detail, comparisonContext) {
  const schemaName = parseReferencedSchemaName(detail.path);
  return Boolean(
    schemaName && shouldSuppressRenamedSchema(schemaName, comparisonContext),
  );
}

function shouldSuppressRenamedSchema(schemaName, comparisonContext = {}) {
  return (
    comparisonContext.includeRenamedSchemaDetails !== true &&
    comparisonContext?.renamedSchemaNames?.has(schemaName) === true
  );
}

export {
  isSchemaRootObjectTypeChange,
  shouldSuppressContractDetail,
  shouldSuppressRenamedSchema,
  shouldSuppressRenamedSchemaDetail,
};
