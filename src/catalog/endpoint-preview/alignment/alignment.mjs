import {
  formatEndpointPreviewCellLine,
  hasEndpointPreviewCellMarker,
  isHighlightableEndpointPreviewLine,
} from './cell-format.mjs';
import {
  keyEndpointPreviewLines,
} from './line-keys.mjs';
import { mergePreviewLineKeys } from './line-merge.mjs';

function buildAlignedEndpointPreview(previousLines, nextLines) {
  const previousKeyedLines = keyEndpointPreviewLines(previousLines);
  const nextKeyedLines = keyEndpointPreviewLines(nextLines);
  const previousByKey = new Map(previousKeyedLines.map((line) => [line.key, line]));
  const nextByKey = new Map(nextKeyedLines.map((line) => [line.key, line]));
  const orderedKeys = mergePreviewLineKeys(previousKeyedLines, nextKeyedLines);
  const rows = [];

  for (const key of orderedKeys) {
    const previousLine = previousByKey.get(key) ?? null;
    const nextLine = nextByKey.get(key) ?? null;
    const kind = getEndpointPreviewLineChangeKind(previousLine, nextLine);

    rows.push({
      previous: formatEndpointPreviewCellLine(previousLine?.text ?? '', kind, 'previous'),
      next: formatEndpointPreviewCellLine(nextLine?.text ?? '', kind, 'next'),
    });
  }

  return {
    rows,
    hasVisibleChanges: hasEndpointPreviewCellMarker(rows),
  };
}

function getEndpointPreviewLineChangeKind(previousLine, nextLine) {
  const previousText = previousLine?.text ?? null;
  const nextText = nextLine?.text ?? null;

  if (previousText === nextText) {
    return null;
  }
  if (!previousLine) {
    return isHighlightableEndpointPreviewLine(nextText) ? 'added' : null;
  }
  if (!nextLine) {
    return isHighlightableEndpointPreviewLine(previousText) ? 'removed' : null;
  }

  return isHighlightableEndpointPreviewLine(previousText) ||
    isHighlightableEndpointPreviewLine(nextText)
    ? 'changed'
    : null;
}

export { buildAlignedEndpointPreview };
