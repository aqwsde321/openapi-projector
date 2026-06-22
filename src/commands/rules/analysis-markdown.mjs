import {
  renderCandidateSection,
  renderPathAliasList,
  renderSectionStats,
  renderStatsList,
  renderWarnings,
} from './analysis-markdown-sections.mjs';

function renderAnalysisMarkdown({
  analysis,
  analysisJsonPath,
  rulesPath,
}) {
  return [
    '# Project Rules Analysis',
    '',
    `- Generated at: ${analysis.generatedAt}`,
    `- Analysis root: \`${analysis.files.analysisRoot}\``,
    `- Total TypeScript files scanned: ${analysis.files.scanned}`,
    `- Analysis JSON: \`${analysisJsonPath}\``,
    `- Suggested rules file: \`${rulesPath}\``,
    '',
    '## Warnings',
    '',
    renderWarnings(analysis.warnings),
    '',
    '## Source sections scanned',
    '',
    renderSectionStats(analysis.files.sections),
    '',
    renderCandidateSection('HTTP client candidate', analysis.httpClient),
    renderCandidateSection('API helper candidate', analysis.apiHelper),
    renderCandidateSection('API layer candidate', analysis.apiLayer),
    renderCandidateSection('Naming candidate', analysis.naming),
    '## Path alias mappings',
    '',
    renderPathAliasList(analysis.pathAliases),
    '',
    '## fetchAPI import candidates',
    '',
    renderStatsList(analysis.legacy.fetchApiImportStats),
    '',
    '## MVP v2 fixed defaults',
    '',
    '- wrapper grouping default: `tag` (`flat` is also supported)',
    '- tag file case: `title`',
    '- React Query hook generation: disabled by default unless the analyzer detects React Query usage',
    '- schema file name: `schema.ts`',
    '',
  ].join('\n');
}

export { renderAnalysisMarkdown };
