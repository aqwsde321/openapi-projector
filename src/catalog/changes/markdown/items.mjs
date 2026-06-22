import { formatChangeDetail } from './detail.mjs';
import {
  formatChangeItemTitle,
  formatProjectFileLinks,
} from './links.mjs';
import {
  appendComparisonTable,
  appendEndpointPreviewDetails,
} from './tables.mjs';

function appendChangeSection(lines, title, items, options = {}) {
  lines.push(`## ${formatChangeSectionTitle(title)}`, '');

  if (items.length === 0) {
    lines.push('- 없음', '');
    return;
  }

  for (const item of items) {
    appendChangeItem(lines, item, options);
  }

  lines.push('');
}

function appendChangeItem(lines, item, options = {}) {
  const title = formatChangeItemTitle(item);
  const projectFileLinks = formatProjectFileLinks(item, options);
  const detailPrefix = '  - ';
  const nestedIndent = '  ';
  const comparisonRows = item.comparisonRows ?? [];
  const hasComparisonRows = comparisonRows.length > 0;

  lines.push(`- ${item.removed ? `~~${title}~~` : title}`);
  if (projectFileLinks) {
    lines.push(`${detailPrefix}후보 파일: ${projectFileLinks}`);
  }

  if (item.detailsUnavailable) {
    lines.push(
      `${detailPrefix}상세 변경 내용은 이전 catalog에 비교용 snapshot이 없어 표시할 수 없습니다. 이번 refresh 이후부터 기록됩니다.`,
    );
    return;
  }

  if (!hasComparisonRows) {
    for (const detail of item.details ?? []) {
      lines.push(`${detailPrefix}${formatChangeDetail(detail)}`);
    }
  }

  if (hasComparisonRows) {
    appendComparisonTable(lines, comparisonRows, item.comparisonTableRows, nestedIndent);
  }

  if (item.detailsTruncated) {
    lines.push(`${detailPrefix}... ${item.detailCount - (item.details?.length ?? 0)}개 변경 항목 생략`);
  }

  if (item.endpointPreview?.hasVisibleChanges) {
    appendEndpointPreviewDetails(lines, item.endpointPreview, nestedIndent);
  }

  if (hasComparisonRows || item.endpointPreview?.hasVisibleChanges) {
    lines.push('');
  }
}

function formatChangeSectionTitle(title) {
  return {
    Added: '🆕 Added',
    Removed: '🗑️ Removed',
    'Contract Changed': '🧩 Contract Changed',
    'Doc Changed': '📝 Doc Changed',
  }[title] ?? title;
}

export { appendChangeSection };
