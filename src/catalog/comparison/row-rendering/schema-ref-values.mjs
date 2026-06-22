import { schemaRefName } from '#src/openapi/refs.mjs';
import { stripMarkdownFormatting } from '../../format/inline.mjs';

function isSchemaRefComparisonRow(row) {
  const target = stripMarkdownFormatting(row?.target);
  return (
    target.endsWith('$ref') &&
    (
      target.startsWith('operation.requestBody') ||
      target.startsWith('operation.responses')
    )
  );
}

function formatSchemaRefName(value) {
  return schemaRefName(stripMarkdownFormatting(value));
}

function formatSchemaRefDeclaration(kind, row) {
  const previousRef = stripMarkdownFormatting(row.previous);
  const nextRef = stripMarkdownFormatting(row.next);

  if (kind === 'changed') {
    return `${schemaRefName(previousRef)} → ${schemaRefName(nextRef)}`;
  }

  const schemaName = schemaRefName(kind === 'removed' ? previousRef : nextRef);
  return kind === 'removed' ? `~${schemaName}~` : schemaName;
}

export {
  formatSchemaRefDeclaration,
  formatSchemaRefName,
  isSchemaRefComparisonRow,
};
