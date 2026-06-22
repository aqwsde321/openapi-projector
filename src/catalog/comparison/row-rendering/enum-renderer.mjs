import { stripMarkdownFormatting } from '../../format/inline.mjs';
import {
  formatComparisonKind,
  getComparisonFieldName,
  localizeComparisonCategory,
} from './labels.mjs';
import { getComparisonEnumValues } from './enum-value-resolver.mjs';

function buildEnumComparisonTableRows(row, kind, comparisonContext) {
  if (kind !== 'changed' || !isEnumComparisonRow(row)) {
    return [];
  }

  const previousValues = getComparisonEnumValues(row, comparisonContext, 'previous');
  const nextValues = getComparisonEnumValues(row, comparisonContext, 'next');
  if (!previousValues || !nextValues) {
    return [];
  }

  const previousSet = new Set(previousValues);
  const nextSet = new Set(nextValues);
  const removedValues = previousValues.filter((value) => !nextSet.has(value));
  const addedValues = nextValues.filter((value) => !previousSet.has(value));
  const field = getComparisonFieldName(row, comparisonContext);
  const location = localizeEnumComparisonCategory(row);

  return [
    ...removedValues.map((value) => ({
      change: formatComparisonKind('removed'),
      location,
      previous: `${field}: ${value}`,
      next: '없음',
    })),
    ...addedValues.map((value) => ({
      change: formatComparisonKind('added'),
      location,
      previous: '없음',
      next: `${field}: ${value}`,
    })),
  ];
}

function isEnumComparisonRow(row) {
  return stripMarkdownFormatting(row?.target).endsWith('.enum');
}

function localizeEnumComparisonCategory(row) {
  const location = localizeComparisonCategory(row);
  if (location.endsWith('파라미터 필드')) {
    return location.replace(/ 필드$/u, ' enum 값');
  }
  if (location.endsWith('필드')) {
    return location.replace(/ 필드$/u, ' enum 값');
  }

  return `${location} enum 값`;
}

export { buildEnumComparisonTableRows };
