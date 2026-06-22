import { buildComparisonContext } from '../context.mjs';
import {
  formatComparisonKind,
  getComparisonRowKind,
  localizeComparisonCategory,
} from './labels.mjs';
import {
  formatComparisonSideDeclaration,
  formatPreviewStyleComparisonDeclaration,
} from './value-renderer.mjs';
import { buildEnumComparisonTableRows } from './enum-renderer.mjs';
import {
  dedupeComparisonTableRows,
  disambiguateIdenticalComparisonTableRow,
} from './table-normalizer.mjs';

function buildComparisonDisplayRows(rows, context = {}) {
  const comparisonContext = buildComparisonContext(context);

  return rows.map((row) => {
    const kind = getComparisonRowKind(row);

    return {
      change: formatComparisonKind(kind),
      location: localizeComparisonCategory(row),
      declaration: formatPreviewStyleComparisonDeclaration(kind, row, comparisonContext),
    };
  });
}

function buildComparisonTableRows(rows, context = {}) {
  const comparisonContext = buildComparisonContext(context);

  const tableRows = rows.flatMap((row) => {
    const kind = getComparisonRowKind(row);
    const enumRows = buildEnumComparisonTableRows(row, kind, comparisonContext);
    if (enumRows.length > 0) {
      return enumRows;
    }

    const previous = formatComparisonSideDeclaration(kind, row, comparisonContext, 'previous');
    const next = formatComparisonSideDeclaration(kind, row, comparisonContext, 'next');

    const renderedRow = {
      change: formatComparisonKind(kind),
      location: localizeComparisonCategory(row),
      previous,
      next,
    };

    return disambiguateIdenticalComparisonTableRow(
      renderedRow,
      row,
      kind,
      comparisonContext,
    );
  });

  return dedupeComparisonTableRows(tableRows);
}

export {
  buildComparisonDisplayRows,
  buildComparisonTableRows,
};
