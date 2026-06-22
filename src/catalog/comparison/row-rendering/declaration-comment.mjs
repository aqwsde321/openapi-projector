import {
  formatComparisonValueFlags,
  parseComparisonValue,
} from './value-summary.mjs';

function formatDeclarationComment(kind, row, summary) {
  if (kind === 'changed') {
    const previousSummary = parseComparisonValue(row.previous);
    const nextSummary = parseComparisonValue(row.next);

    if (
      previousSummary.type &&
      previousSummary.type === nextSummary.type &&
      previousSummary.nullable !== nextSummary.nullable
    ) {
      return nextSummary.nullable ? ' (nullable 추가)' : ' (nullable 제거)';
    }

    if (
      previousSummary.type &&
      previousSummary.type === nextSummary.type &&
      previousSummary.required !== null &&
      nextSummary.required !== null &&
      previousSummary.required !== nextSummary.required
    ) {
      const previousRequired = previousSummary.required
        ? 'required'
        : 'optional';
      const nextRequired = nextSummary.required ? 'required' : 'optional';
      return ` (${previousRequired} → ${nextRequired})`;
    }

    return previousSummary.raw && nextSummary.raw
      ? ` (${previousSummary.raw} → ${nextSummary.raw})`
      : '';
  }

  return formatComparisonValueFlags(summary);
}

export { formatDeclarationComment };
