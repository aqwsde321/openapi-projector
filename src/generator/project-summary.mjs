import {
  renderApplicationReviewSection,
} from './project-summary-application-review.mjs';

function renderProjectSummary(manifest) {
  const lines = [
    '# Project Candidate Summary',
    '',
    `- Generated at: ${manifest.generatedAt}`,
    `- Source OpenAPI: ${manifest.sourcePath}`,
    `- Project rules: ${manifest.projectRulesPath}`,
    `- Project rules analysis: ${manifest.projectRulesAnalysisPath}`,
    `- Project rules analysis JSON: ${manifest.projectRulesAnalysisJsonPath}`,
    `- Review schema: ${manifest.generatedSchemaPath}`,
    `- Total endpoints: ${manifest.totalEndpoints}`,
    `- Generated endpoints: ${manifest.generatedEndpoints}`,
    `- Skipped endpoints: ${manifest.skippedEndpoints}`,
    '',
    '## Generated Files',
    '',
    ...renderGeneratedFiles(manifest.files),
    ...renderApplicationReviewSection(manifest.applicationReview),
    ...renderSkippedOperations(manifest.skippedOperations),
    '',
  ];

  return lines.join('\n');
}

function renderGeneratedFiles(files = []) {
  return files.map((entry) =>
    `- [${entry.kind}] \`${entry.generated}\`${entry.summary ? ` (${entry.summary})` : ''}`
  );
}

function renderSkippedOperations(skippedOperations = []) {
  if (skippedOperations.length === 0) {
    return [];
  }

  const lines = [
    '',
    '## Skipped Operations',
    '',
  ];

  for (const skippedOperation of skippedOperations) {
    lines.push(
      `- \`${skippedOperation.method} ${skippedOperation.path}\`: ${skippedOperation.reasons.join(', ')}`,
    );
  }

  return lines;
}

export {
  renderProjectSummary,
};
