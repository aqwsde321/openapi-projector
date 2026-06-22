import { stripMarkdownFormatting } from '../../format/inline.mjs';
import {
  parseComparisonEnumValues,
} from '../enum-values/index.mjs';
import {
  getParameterEnumValues,
  getSchemaPropertyEnumValues,
} from './enum-lookups.mjs';
import {
  getComparisonSnapshotForSide,
} from '../snapshots.mjs';

function getComparisonEnumValues(row, comparisonContext, side) {
  const target = stripMarkdownFormatting(row?.target);
  const snapshot = getComparisonSnapshotForSide(comparisonContext, side);
  const fallbackValues = parseComparisonEnumValues(
    side === 'previous' ? row?.previous : row?.next,
  );

  if (!snapshot) {
    return fallbackValues;
  }

  const parameterValues = getParameterEnumValues(
    row,
    comparisonContext,
    snapshot,
    target,
  );
  if (parameterValues) {
    return parameterValues;
  }

  return (
    getSchemaPropertyEnumValues(
      row,
      comparisonContext,
      side,
      snapshot,
      target,
    ) ?? fallbackValues
  );
}

export { getComparisonEnumValues };
