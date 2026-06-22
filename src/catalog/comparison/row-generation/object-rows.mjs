import { formatInlineCode } from '../../format/inline.mjs';
import { parseReferencedSchemaName } from '../path-utils/index.mjs';
import { getSchemaFieldCategory } from '../schema-usage/targets.mjs';
import { appendParameterObjectRows } from './parameter-object-rows.mjs';
import { appendSchemaRequiredRows } from './object-required-rows.mjs';
import { collectSchemaPropertyGroups } from './object-row-groups.mjs';
import {
  formatSchemaPropertySummary,
  getReferencedSchemaNames,
  hasSchemaPropertyTypeEvidence,
} from './object-row-property-values.mjs';

function appendSchemaPropertyObjectRows(
  rows,
  details,
  consumedIndexes,
  comparisonContext,
) {
  const groups = collectSchemaPropertyGroups(
    details,
    consumedIndexes,
    comparisonContext,
  );

  const referencedSchemaNames = new Set();
  for (const group of groups.values()) {
    for (const schemaName of getReferencedSchemaNames(group.values)) {
      referencedSchemaNames.add(schemaName);
    }
  }

  details.forEach((detail, index) => {
    const schemaName = parseReferencedSchemaName(detail.path);
    if (schemaName && referencedSchemaNames.has(schemaName)) {
      consumedIndexes.add(index);
    }
  });

  for (const group of groups.values()) {
    if (referencedSchemaNames.has(group.schemaName)) {
      continue;
    }

    if (!hasSchemaPropertyTypeEvidence(group.values)) {
      continue;
    }

    rows.push({
      category: getSchemaFieldCategory(group.schemaName, comparisonContext),
      target: formatInlineCode(`${group.schemaName}.${group.propertyName}`),
      previous:
        group.kind === 'added'
          ? '없음'
          : formatSchemaPropertySummary(group.values),
      next:
        group.kind === 'removed'
          ? '없음'
          : formatSchemaPropertySummary(group.values),
    });

    group.indexes.forEach((index) => consumedIndexes.add(index));
  }
}

export {
  appendParameterObjectRows,
  appendSchemaPropertyObjectRows,
  appendSchemaRequiredRows,
};
