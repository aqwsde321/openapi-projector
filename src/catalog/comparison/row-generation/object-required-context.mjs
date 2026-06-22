import {
  parseReferencedSchemaName,
  parseSchemaPropertyDetailPath,
} from '../path-utils/index.mjs';
import {
  getAddedOrRemovedDetailValue,
  isAddedOrRemovedDetail,
} from './object-row-values.mjs';
import { hasSchemaPropertyTypeEvidence } from './object-row-property-values.mjs';
import { isSchemaRootObjectTypeChange } from './object-row-suppression.mjs';

function getAddedOrRemovedSchemaPropertyNames(details) {
  const groups = new Map();

  details.forEach((detail) => {
    const parsed = parseSchemaPropertyDetailPath(detail.path);

    if (!parsed || !isAddedOrRemovedDetail(detail)) {
      return;
    }

    const key = `${parsed.schemaName}.${parsed.propertyName}`;
    const values = groups.get(key) ?? new Map();
    values.set(parsed.fieldPath, getAddedOrRemovedDetailValue(detail));
    groups.set(key, values);
  });

  return new Set(
    [...groups.entries()]
      .filter(([, values]) => hasSchemaPropertyTypeEvidence(values))
      .map(([key]) => key),
  );
}

function getSchemaRootObjectChangeNames(details) {
  return new Set(
    details
      .filter(isSchemaRootObjectTypeChange)
      .map((detail) => parseReferencedSchemaName(detail.path))
      .filter(Boolean),
  );
}

export {
  getAddedOrRemovedSchemaPropertyNames,
  getSchemaRootObjectChangeNames,
};
