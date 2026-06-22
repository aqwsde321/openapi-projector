import {
  buildComparisonContext,
  buildComparisonDisplayRows,
  buildComparisonRows,
  buildComparisonTableRows,
} from '../comparison/rows.mjs';
import { shouldSuppressContractDetail } from '../comparison/row-generation/object-row-suppression.mjs';
import { diffValues } from '../diff-utils/diff-values.mjs';
import { normalizeDiffValue } from '../diff-utils/normalize.mjs';

const MAX_CHANGE_DETAILS = 60;

function diffContractSnapshots(previousSnapshot, nextSnapshot) {
  return diffValues(
    normalizeDiffValue(previousSnapshot),
    normalizeDiffValue(nextSnapshot),
    [],
  );
}

function buildContractChangeItem(baseItem, previousEntry, nextEntry) {
  const hasSnapshots = previousEntry?.contractSnapshot && nextEntry?.contractSnapshot;

  if (!hasSnapshots) {
    return {
      ...baseItem,
      detailCount: 0,
      detailsTruncated: false,
      detailsUnavailable: true,
      details: [],
    };
  }

  const allDetails = diffContractSnapshots(
    previousEntry.contractSnapshot,
    nextEntry.contractSnapshot,
  );
  const comparisonContext = buildComparisonContext({
    previousSnapshot: previousEntry.contractSnapshot,
    nextSnapshot: nextEntry.contractSnapshot,
  });
  const reportableDetails = allDetails.filter((detail) =>
    !shouldSuppressContractDetail(detail, comparisonContext)
  );
  if (allDetails.length > 0 && reportableDetails.length === 0) {
    return null;
  }
  const details =
    reportableDetails.length > 0
      ? reportableDetails
      : [
          {
            kind: 'changed',
            path: 'contractFingerprint',
            previous: previousEntry.contractFingerprint,
            next: nextEntry.contractFingerprint,
          },
        ];

  const comparisonRows = buildComparisonRows(
    details.slice(0, MAX_CHANGE_DETAILS),
    comparisonContext,
  );
  const comparisonTableRows = buildComparisonTableRows(comparisonRows, comparisonContext);

  return {
    ...baseItem,
    detailCount: details.length,
    detailsTruncated: details.length > MAX_CHANGE_DETAILS,
    details: details.slice(0, MAX_CHANGE_DETAILS),
    comparisonRows,
    comparisonTableRows,
    comparisonDisplayRows: buildComparisonDisplayRows(comparisonRows, comparisonContext),
  };
}

export { buildContractChangeItem };
