import { escapeMarkdownTableCell } from './markdown-format.mjs';

function renderEndpointCatalogMarkdown(entries) {
  const lines = [
    '# Endpoint Catalog',
    '',
    '| ID | Method | Path | Summary | Tags |',
    '| --- | --- | --- | --- | --- |',
    ...entries.map((entry) =>
      `| \`${entry.id}\` | \`${entry.method.toUpperCase()}\` | \`${entry.path}\` | ${escapeMarkdownTableCell(entry.summary)} | ${escapeMarkdownTableCell(entry.tags.join(', '))} |`,
    ),
    '',
  ];
  return lines.join('\n');
}

export { renderEndpointCatalogMarkdown };
