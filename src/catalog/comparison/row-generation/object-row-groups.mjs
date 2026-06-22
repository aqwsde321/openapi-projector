import { parseSchemaPropertyDetailPath } from '../path-utils/index.mjs';
import {
  getAddedOrRemovedDetailValue,
  isAddedOrRemovedDetail,
} from './object-row-values.mjs';
import { shouldSuppressRenamedSchema } from './object-row-suppression.mjs';

function collectSchemaPropertyGroups(
  details,
  consumedIndexes,
  comparisonContext,
) {
  const groups = new Map();

  details.forEach((detail, index) => {
    const parsed = parseSchemaPropertyDetailPath(detail.path);

    if (!parsed || !isAddedOrRemovedDetail(detail)) {
      return;
    }
    if (shouldSuppressRenamedSchema(parsed.schemaName, comparisonContext)) {
      consumedIndexes.add(index);
      return;
    }

    const groupKey =
      `${detail.kind}:${parsed.schemaName}.${parsed.propertyName}`;
    const group = groups.get(groupKey) ?? {
      kind: detail.kind,
      schemaName: parsed.schemaName,
      propertyName: parsed.propertyName,
      indexes: [],
      values: new Map(),
    };

    group.indexes.push(index);
    group.values.set(parsed.fieldPath, getAddedOrRemovedDetailValue(detail));
    groups.set(groupKey, group);
  });

  return groups;
}

export { collectSchemaPropertyGroups };
