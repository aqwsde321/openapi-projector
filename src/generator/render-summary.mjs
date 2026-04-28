function renderProjectSummary(manifest) {
  const lines = [
    '# Project Candidate Summary',
    '',
    `- Generated at: ${manifest.generatedAt}`,
    `- Source OpenAPI: ${manifest.sourcePath}`,
    `- Project rules: ${manifest.projectRulesPath}`,
    `- Review schema: ${manifest.generatedSchemaPath}`,
    `- Total endpoints: ${manifest.totalEndpoints}`,
    `- Generated endpoints: ${manifest.generatedEndpoints}`,
    `- Skipped endpoints: ${manifest.skippedEndpoints}`,
    '',
    '## Generated Files',
    '',
  ];

  for (const entry of manifest.files) {
    lines.push(
      `- [${entry.kind}] \`${entry.generated}\`${entry.summary ? ` (${entry.summary})` : ''}`,
    );
  }

  if (manifest.skippedOperations.length > 0) {
    lines.push('');
    lines.push('## Skipped Operations');
    lines.push('');

    for (const skippedOperation of manifest.skippedOperations) {
      lines.push(
        `- \`${skippedOperation.method} ${skippedOperation.path}\`: ${skippedOperation.reasons.join(', ')}`,
      );
    }
  }

  lines.push('');
  return lines.join('\n');
}

export { renderProjectSummary };
