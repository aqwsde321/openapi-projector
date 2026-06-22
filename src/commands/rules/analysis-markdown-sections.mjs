function renderStatsList(stats) {
  if (stats.length === 0) {
    return '- 없음';
  }

  return stats.map((item) => `- \`${item.importPath}\`: ${item.count}`).join('\n');
}

function renderPathAliasList(pathAliases) {
  if (!pathAliases?.configPath || pathAliases.mappings.length === 0) {
    return '- 없음';
  }

  return [
    `- Config: \`${pathAliases.configPath}\``,
    ...pathAliases.mappings.map(
      (item) => `- \`${item.aliasPattern}\` -> \`${item.targetPattern}\``,
    ),
  ].join('\n');
}

function renderSectionStats(sections) {
  if (!sections || sections.length === 0) {
    return '- 없음';
  }

  return sections.map((item) => `- \`${item.section}\`: ${item.count}`).join('\n');
}

function renderWarnings(warnings) {
  if (!warnings || warnings.length === 0) {
    return '- 없음';
  }

  return warnings.map((item) => `- \`${item.code}\`: ${item.message}`).join('\n');
}

function renderEvidenceList(evidence) {
  if (!evidence || evidence.length === 0) {
    return '- 근거 없음';
  }

  return evidence
    .map((item) => {
      const snippet = item.snippet ? ` — \`${item.snippet}\`` : '';
      return `- \`${item.file}\`: ${item.reason}${snippet}`;
    })
    .join('\n');
}

function renderCandidateValue(value) {
  if (value && typeof value === 'object') {
    return `\`${JSON.stringify(value)}\``;
  }

  return `\`${String(value)}\``;
}

function renderCandidateSection(title, candidate) {
  return [
    `## ${title}`,
    '',
    `- Value: ${renderCandidateValue(candidate.value)}`,
    `- Confidence: ${candidate.confidence}`,
    '',
    '### Evidence',
    '',
    renderEvidenceList(candidate.evidence),
    '',
  ].join('\n');
}

export {
  renderCandidateSection,
  renderPathAliasList,
  renderSectionStats,
  renderStatsList,
  renderWarnings,
};
