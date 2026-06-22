import { formatDocumentationPathLabel } from './change-doc-labels.mjs';

function formatDocumentationChangeDetail(detail) {
  if (detail.path === 'documentation' && detail.message) {
    return `🟡 문서 변경: ${detail.message}`;
  }

  const label = formatDocumentationPathLabel(detail.path);

  if (!label) {
    return null;
  }

  return `🟡 ${label} 변경: ${formatDocumentationValue(detail.previous)} → ${formatDocumentationValue(detail.next)}`;
}

function formatDocumentationValue(value) {
  if (value === null || value === undefined || value === '') {
    return '없음';
  }

  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  const compact = String(raw).replace(/\s+/g, ' ').trim();
  return compact.length > 160 ? `${compact.slice(0, 157)}...` : compact;
}

export { formatDocumentationChangeDetail };
