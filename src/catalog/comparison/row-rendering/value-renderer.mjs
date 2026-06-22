import { stripMarkdownFormatting } from '../../format/inline.mjs';
import {
  getComparisonFieldName,
} from './labels.mjs';
import { formatDeclarationComment } from './declaration-comment.mjs';
import {
  formatSchemaRefDeclaration,
  formatSchemaRefName,
  isSchemaRefComparisonRow,
} from './schema-ref-values.mjs';
import {
  formatSnapshotComparisonDeclaration,
  inferJavaTypeFromComparisonContext,
} from './snapshot-declaration.mjs';
import {
  formatComparisonValueFlags,
  javaTypeFromComparisonValue,
  parseComparisonValue,
} from './value-summary.mjs';

function formatPreviewStyleComparisonDeclaration(kind, row, comparisonContext) {
  if (isSchemaRefComparisonRow(row)) {
    return formatSchemaRefDeclaration(kind, row);
  }

  const summary = parseComparisonValue(
    kind === 'removed' ? row.previous : row.next,
  );
  const field = getComparisonFieldName(row, comparisonContext);
  const type = summary.type
    ? javaTypeFromComparisonValue(summary)
    : inferJavaTypeFromComparisonContext(row, comparisonContext);
  const comment = formatDeclarationComment(kind, row, summary);
  const declaration = type
    ? `${field}: ${type}${comment}`
    : `${field}${comment}`;

  return kind === 'removed' ? `~${declaration}~` : declaration;
}

function formatComparisonSideDeclaration(kind, row, comparisonContext, side) {
  if ((side === 'previous' && kind === 'added') || (side === 'next' && kind === 'removed')) {
    return '없음';
  }

  if (isSchemaRefComparisonRow(row)) {
    return formatSchemaRefName(side === 'previous' ? row.previous : row.next);
  }

  const snapshotDeclaration = formatSnapshotComparisonDeclaration(row, comparisonContext, side);
  if (snapshotDeclaration) {
    return snapshotDeclaration;
  }

  const summary = parseComparisonValue(side === 'previous' ? row.previous : row.next);
  const field = getComparisonFieldName(row, comparisonContext);
  const type = summary.type
    ? javaTypeFromComparisonValue(summary)
    : inferJavaTypeFromComparisonContext(row, comparisonContext);

  if (type) {
    return `${field}: ${type}${formatComparisonValueFlags(summary)}`;
  }

  return stripMarkdownFormatting(side === 'previous' ? row.previous : row.next);
}

export {
  formatComparisonSideDeclaration,
  formatPreviewStyleComparisonDeclaration,
};
