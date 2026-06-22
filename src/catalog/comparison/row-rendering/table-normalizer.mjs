import { stripMarkdownFormatting } from '../../format/inline.mjs';
import { getComparisonFieldName } from './labels.mjs';

function dedupeComparisonTableRows(rows) {
  const seen = new Set();

  return rows.filter((row) => {
    const key = [
      row.change,
      row.location,
      row.previous,
      row.next,
    ].join('\u0000');

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function disambiguateIdenticalComparisonTableRow(
  renderedRow,
  row,
  kind,
  comparisonContext,
) {
  if (kind !== 'changed' || renderedRow.previous !== renderedRow.next) {
    return renderedRow;
  }

  const previousRaw = stripMarkdownFormatting(row.previous);
  const nextRaw = stripMarkdownFormatting(row.next);
  if (!previousRaw || !nextRaw || previousRaw === nextRaw) {
    return renderedRow;
  }

  const field = getComparisonFieldName(row, comparisonContext);
  return {
    ...renderedRow,
    previous: `${field}: ${previousRaw}`,
    next: `${field}: ${nextRaw}`,
  };
}

export {
  dedupeComparisonTableRows,
  disambiguateIdenticalComparisonTableRow,
};
