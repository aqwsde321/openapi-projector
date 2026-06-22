import {
  formatMarkdownLink,
} from '../../markdown-format.mjs';
import { appendChangeSection } from './items.mjs';

function renderChangeMarkdown(changeSummary, options = {}) {
  const lines = [
    '# Change Summary',
    '',
    `- Generated at: ${changeSummary.generatedAt}`,
    `- Current total endpoints: ${changeSummary.total}`,
  ];

  appendLocationLinks(lines, options);
  if (changeSummary.baseline) {
    lines.push('- Baseline: 이전 catalog 가 없어서 이번 결과를 기준선으로 저장했습니다.', '');
    return lines.join('\n');
  }

  lines.push(`- 🆕 Added: ${changeSummary.added.length}`);
  lines.push(`- 🗑️ Removed: ${changeSummary.removed.length}`);
  lines.push(`- 🧩 Contract Changed: ${changeSummary.contractChanged.length}`);
  lines.push(`- 📝 Doc Changed: ${changeSummary.docChanged.length}`);
  lines.push('');

  appendChangeSection(lines, 'Added', changeSummary.added, options);
  appendChangeSection(lines, 'Removed', changeSummary.removed, options);
  appendChangeSection(lines, 'Contract Changed', changeSummary.contractChanged, options);
  appendChangeSection(lines, 'Doc Changed', changeSummary.docChanged, options);

  return lines.join('\n');
}

function appendLocationLinks(lines, options = {}) {
  const { locationLinks } = options;

  if (!locationLinks) {
    return;
  }

  const links = [
    ['History', locationLinks.history],
    ['Comparison baseline', locationLinks.catalogBaseline],
  ].filter(([, target]) => target);

  if (links.length === 0) {
    return;
  }

  for (const [label, target] of links) {
    lines.push(`- ${label}: ${formatMarkdownLink(target, target, options)}`);
  }
}

export { renderChangeMarkdown };
