import { formatDetailValue } from '../../format/inline.mjs';
import { formatDocumentationChangeDetail } from '../change-doc-markdown.mjs';

function formatChangeDetail(detail) {
  const documentationDetail = formatDocumentationChangeDetail(detail);
  if (documentationDetail) {
    return documentationDetail;
  }

  const pathLabel = `\`${detail.path}\``;

  if (detail.kind === 'added') {
    return `${pathLabel}: 추가됨 ${formatDetailValue(detail.next)}`;
  }

  if (detail.kind === 'removed') {
    return `${pathLabel}: 제거됨 ${formatDetailValue(detail.previous)}`;
  }

  return `${pathLabel}: ${formatDetailValue(detail.previous)} -> ${formatDetailValue(detail.next)}`;
}

export { formatChangeDetail };
