import {
  formatDetailValue,
  formatInlineCode,
} from '../../format/inline.mjs';
import {
  parseSchemaPropertyDetailPath,
} from '../path-utils/index.mjs';
import {
  isSchemaRootObjectTypeChange,
  shouldSuppressRenamedSchemaDetail,
} from './object-row-suppression.mjs';
import {
  classifyChangeDetail,
  formatSchemaPropertyTarget,
} from './generic-row-categories.mjs';
import {
  getSchemaFieldCategory,
} from '../schema-usage/targets.mjs';

function toGenericComparisonRow(detail, comparisonContext) {
  if (isSchemaRootObjectTypeChange(detail)) {
    return null;
  }
  if (shouldSuppressRenamedSchemaDetail(detail, comparisonContext)) {
    return null;
  }

  const schemaProperty = parseSchemaPropertyDetailPath(detail.path);

  return {
    category: schemaProperty
      ? getSchemaFieldCategory(schemaProperty.schemaName, comparisonContext)
      : classifyChangeDetail(detail.path, comparisonContext),
    target: formatInlineCode(
      schemaProperty ? formatSchemaPropertyTarget(schemaProperty) : detail.path,
    ),
    previous: detail.kind === 'added' ? '없음' : formatDetailValue(detail.previous),
    next: detail.kind === 'removed' ? '없음' : formatDetailValue(detail.next),
  };
}

export { toGenericComparisonRow };
