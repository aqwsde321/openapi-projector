import { escapeMarkdownTableHtml } from '../../markdown-format.mjs';
import { isEndpointPreviewGroupLine } from './line-parser.mjs';

function hasEndpointPreviewCellMarker(rows) {
  return rows.some((row) => /[🟢🟡🔴]/u.test(`${row.previous}${row.next}`));
}

function isHighlightableEndpointPreviewLine(line) {
  const trimmed = String(line ?? '').trim();
  return Boolean(
    trimmed &&
      trimmed !== '요청' &&
      trimmed !== '응답' &&
      !isEndpointPreviewGroupLine(trimmed),
  );
}

function formatEndpointPreviewCellLine(line, kind, side) {
  const text = formatEndpointPreviewTableText(line);
  const shouldMark =
    (kind === 'changed' && text !== '&nbsp;') ||
    (kind === 'added' && side === 'next' && text !== '&nbsp;') ||
    (kind === 'removed' && side === 'previous' && text !== '&nbsp;');

  if (!shouldMark) {
    return text;
  }

  const marker = {
    added: '🟢 ',
    changed: '🟡 ',
    removed: '🔴 ',
  }[kind] ?? '';
  const markedText = `${marker}${text}`;

  return kind === 'removed' ? `~~${markedText}~~` : `**${markedText}**`;
}

function formatEndpointPreviewTableText(line) {
  const raw = String(line ?? '');
  if (!raw) {
    return '&nbsp;';
  }

  const leadingSpaces = raw.match(/^ */u)?.[0].length ?? 0;
  const content = escapeMarkdownTableHtml(raw.slice(leadingSpaces))
    .replace(/\|/g, '&#124;');
  return `${'&nbsp;'.repeat(leadingSpaces)}${content}`;
}

export {
  formatEndpointPreviewCellLine,
  hasEndpointPreviewCellMarker,
  isHighlightableEndpointPreviewLine,
};
