import { formatInlineCode } from '../../format/inline.mjs';
import {
  parseSchemaRequiredDetailPath,
} from '../path-utils/index.mjs';
import { getSchemaFieldCategory } from '../schema-usage/targets.mjs';
import {
  shouldSuppressRenamedSchema,
} from './object-row-suppression.mjs';
import { getSchemaRequiredFieldChanges } from './object-required-field-changes.mjs';
import {
  getAddedOrRemovedSchemaPropertyNames,
  getSchemaRootObjectChangeNames,
} from './object-required-context.mjs';

function appendSchemaRequiredRows(rows, details, consumedIndexes, comparisonContext) {
  const rootObjectSchemaChanges = getSchemaRootObjectChangeNames(details);
  const changedPropertyNames = getAddedOrRemovedSchemaPropertyNames(details);

  details.forEach((detail, index) => {
    const parsed = parseSchemaRequiredDetailPath(detail.path);

    if (!parsed || !['added', 'changed', 'removed'].includes(detail.kind)) {
      return;
    }
    if (rootObjectSchemaChanges.has(parsed.schemaName)) {
      consumedIndexes.add(index);
      return;
    }
    if (shouldSuppressRenamedSchema(parsed.schemaName, comparisonContext)) {
      consumedIndexes.add(index);
      return;
    }

    for (const { fieldName, wasRequired, isRequired } of getSchemaRequiredFieldChanges(
      parsed.schemaName,
      detail,
      changedPropertyNames,
    )) {
      rows.push({
        category: getSchemaFieldCategory(parsed.schemaName, comparisonContext),
        target: formatInlineCode(`${parsed.schemaName}.${fieldName}.required`),
        previous: wasRequired ? 'required' : 'optional',
        next: isRequired ? 'required' : 'optional',
      });
    }

    consumedIndexes.add(index);
  });
}

export { appendSchemaRequiredRows };
