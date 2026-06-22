import { buildAlignedEndpointPreview } from './endpoint-preview/alignment/alignment.mjs';
import { renderPreviewRequestLines } from './endpoint-preview/rendering/request.mjs';
import { renderPreviewResponseLines } from './endpoint-preview/rendering/response.mjs';

function buildEndpointPreview(previousEntry, nextEntry) {
  if (!previousEntry?.contractSnapshot && !nextEntry?.contractSnapshot) {
    return null;
  }

  return buildAlignedEndpointPreview(
    renderEndpointPreviewLines(previousEntry),
    renderEndpointPreviewLines(nextEntry),
  );
}

function renderEndpointPreviewLines(entry) {
  if (!entry?.contractSnapshot) {
    return ['없음'];
  }

  return [
    ...renderPreviewRequestLines(entry.contractSnapshot),
    '',
    ...renderPreviewResponseLines(entry.contractSnapshot),
  ];
}

export { buildEndpointPreview };
